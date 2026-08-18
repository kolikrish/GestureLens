/**
 * GLSL Shaders for the 3D Origami Mask-Hands ribbon.
 *
 * MainMaskShader  — applied to the center video panel
 * FoldFlapShader  — applied to top / bottom / side fold flaps
 */

// ─── Center Panel (Video Feed + Stylized Effects) ────────────────────────────
export const MainMaskShader = {
  uniforms: {
    tVideo:         { value: null },
    uResolution:    { value: [1, 1] },
    uTime:          { value: 0 },
    uMode:          { value: 0 },      // 0 Riso | 1 Xerox | 2 Halftone | 3 Thermal | 4 Clean
    uContrast:      { value: 1.4 },
    uBrightness:    { value: 0.05 },
    uGrainIntensity:{ value: 0.18 },
    uDotScale:      { value: 65 },
    uColorIntensity:{ value: 1.3 },
    uUseScreenUV:   { value: 1.0 },   // 1 = Screen UV (X-Ray window), 0 = Surface UV
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    varying vec2 vScreenUv;
    varying vec3 vNormal;

    void main() {
      vUv    = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vScreenUv = clip.xy / clip.w * 0.5 + 0.5;
      gl_Position = clip;
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tVideo;
    uniform float uTime;
    uniform int   uMode;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uGrainIntensity;
    uniform float uDotScale;
    uniform float uUseScreenUV;

    varying vec2 vUv;
    varying vec2 vScreenUv;
    varying vec3 vNormal;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }

    float halftone(vec2 uv, float angle, float scale) {
      float s = sin(angle), c = cos(angle);
      vec2 r = mat2(c,-s,s,c) * uv * scale;
      return length(fract(r) - 0.5);
    }

    float luma(vec3 col) { return dot(col, vec3(0.299,0.587,0.114)); }

    void main() {
      // X-ray (screen UV) or surface UV
      vec2 sUv = mix(vUv, vScreenUv, uUseScreenUV);
      // Clamp to [0,1]
      sUv = clamp(sUv, 0.001, 0.999);

      vec3 col = texture2D(tVideo, sUv).rgb;
      col = clamp((col - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);

      float lum   = luma(col);
      float grain = (rand(gl_FragCoord.xy + fract(uTime)) - 0.5) * uGrainIntensity;

      // Subtle paper shading from geometry normal
      float diff = max(dot(vNormal, normalize(vec3(0.2,0.8,1.0))), 0.0) * 0.25 + 0.75;

      vec3 out_col = col;

      if (uMode == 0) {
        // ── Riso Pop-Art ──────────────────────────────────────────────────
        vec3 ink0 = vec3(0.05,0.22,0.52);  // deep blue
        vec3 ink1 = vec3(0.00,0.55,0.25);  // forest green
        vec3 ink2 = vec3(0.98,0.85,0.05);  // yellow
        vec3 ink3 = vec3(0.95,0.35,0.10);  // orange
        vec3 paper= vec3(0.98,0.98,0.96);

        if      (lum < 0.20) out_col = mix(ink0, ink1, lum / 0.20);
        else if (lum < 0.45) out_col = mix(ink1, ink2, (lum-0.20)/0.25);
        else if (lum < 0.75) out_col = mix(ink2, ink3, (lum-0.45)/0.30);
        else                 out_col = mix(ink3, paper, (lum-0.75)/0.25);

        float d = halftone(sUv, 0.52, uDotScale*1.5);
        if (d < 0.55*(1.0-lum)) out_col = mix(out_col, ink0*0.5, 0.35);
        out_col += grain;

      } else if (uMode == 1) {
        // ── Blue Xerox Monoprint ──────────────────────────────────────────
        vec3 ink  = vec3(0.04,0.28,0.62);
        vec3 paper= vec3(0.94,0.95,0.98);
        float p   = smoothstep(0.35, 0.65, lum + grain*1.8);
        out_col   = mix(ink, paper, p) - rand(gl_FragCoord.xy*2.5)*0.08;

      } else if (uMode == 2) {
        // ── CMYK Comic Halftone ───────────────────────────────────────────
        vec3 paper = vec3(0.98,0.96,0.92);
        vec3 cmyk  = 1.0 - col;
        float cD = halftone(sUv,0.26,uDotScale), mD = halftone(sUv,1.30,uDotScale);
        float yD = halftone(sUv,0.00,uDotScale), kD = halftone(sUv,0.78,uDotScale*0.9);
        out_col = paper;
        out_col = mix(out_col, vec3(0.0,0.7,0.9),  step(cD,cmyk.r*0.7)*0.85);
        out_col = mix(out_col, vec3(0.9,0.1,0.4),  step(mD,cmyk.g*0.7)*0.85);
        out_col = mix(out_col, vec3(0.95,0.85,0.0),step(yD,cmyk.b*0.7)*0.85);
        out_col = mix(out_col, vec3(0.05,0.05,0.1),step(kD,(1.0-lum)*0.85)*0.9);
        out_col += grain*0.5;

      } else if (uMode == 3) {
        // ── Thermal Glitch ────────────────────────────────────────────────
        out_col = vec3(
          smoothstep(0.3,0.7,lum)+smoothstep(0.8,1.0,lum),
          smoothstep(0.1,0.5,lum)-smoothstep(0.7,0.9,lum),
          1.0-smoothstep(0.0,0.4,lum)+smoothstep(0.8,1.0,lum)*0.5
        );
        out_col = mix(out_col, col, 0.2) + grain;

      } else {
        // ── Clean AR ──────────────────────────────────────────────────────
        out_col = col + grain*0.3;
      }

      out_col *= diff;

      // Thin paper edge on quad borders
      vec2 bd = smoothstep(vec2(0.0),vec2(0.05),vUv) * smoothstep(vec2(1.0),vec2(0.95),vUv);
      out_col  = mix(vec3(0.97), out_col, smoothstep(0.0,0.04,bd.x*bd.y));

      gl_FragColor = vec4(out_col, 1.0);
    }
  `
};

// ─── Fold Flap (Red Halftone Dots / Hazard Print) ────────────────────────────
export const FoldFlapShader = {
  uniforms: {
    uTime:        { value: 0 },
    uDotColor:    { value: [0.92, 0.20, 0.18] },
    uBgColor:     { value: [0.98, 0.98, 0.97] },
    uDotScale:    { value: 40 },
    uPatternType: { value: 0 },  // 0 halftone dots | 1 diagonal bars | 2 micro dots
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vUv    = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform vec3  uDotColor;
    uniform vec3  uBgColor;
    uniform float uDotScale;
    uniform int   uPatternType;

    varying vec2 vUv;
    varying vec3 vNormal;

    float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453); }

    void main() {
      vec3 col = uBgColor;
      float grain = (rand(gl_FragCoord.xy)-0.5)*0.06;

      if (uPatternType == 0) {
        // Halftone gradient dots (denser at edges / top)
        vec2 g  = fract(vUv * vec2(uDotScale, 8.0)) - 0.5;
        float d = length(g);
        float density = sin(vUv.x*3.14159)*0.45 + (1.0-vUv.y)*0.35;
        density = clamp(density, 0.05, 0.48);
        if (d < density) col = uDotColor;

      } else if (uPatternType == 1) {
        float s = sin((vUv.x*25.0+vUv.y*10.0))*0.5+0.5;
        if (s > 0.5) col = uDotColor;

      } else {
        vec2 g = fract(vUv*vec2(60.0,12.0))-0.5;
        if (length(g)<0.28) col = uDotColor;
      }

      col += grain;

      float diff = max(dot(vNormal,normalize(vec3(0.2,0.9,0.8))),0.0)*0.3+0.7;
      col *= diff;

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
