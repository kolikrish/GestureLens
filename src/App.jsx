import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import './App.css'

const INDEX_TIP = 8
const THUMB_TIP = 4
const PINCH_THRESHOLD = 0.035  // tighter — requires deliberate touch
const SMOOTH = 0.1

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function ema(prev, next) {
  if (!prev) return { ...next }
  return { x: prev.x + SMOOTH * (next.x - prev.x), y: prev.y + SMOOTH * (next.y - prev.y) }
}

// ─── 10 Effects ───────────────────────────────────────────────────────────────

function fxPixelate(id, w, h) {
  const block = 14, out = new ImageData(w, h), d = id.data, o = out.data
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let r=0,g=0,b=0,cnt=0
      for (let y=by; y<Math.min(by+block,h); y++)
        for (let x=bx; x<Math.min(bx+block,w); x++) {
          const i=(y*w+x)*4; r+=d[i]; g+=d[i+1]; b+=d[i+2]; cnt++
        }
      r/=cnt; g/=cnt; b/=cnt
      for (let y=by; y<Math.min(by+block,h); y++)
        for (let x=bx; x<Math.min(bx+block,w); x++) {
          const i=(y*w+x)*4; o[i]=r; o[i+1]=g; o[i+2]=b; o[i+3]=255
        }
    }
  }
  return out
}

function fxNoise(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data
  for (let i=0; i<d.length; i+=4) {
    const n=(Math.random()-.5)*90
    o[i]  =Math.min(255,Math.max(0,d[i]+n))
    o[i+1]=Math.min(255,Math.max(0,d[i+1]+n))
    o[i+2]=Math.min(255,Math.max(0,d[i+2]+n))
    o[i+3]=255
  }
  return out
}

function fxNeon(id, w, h) {
  const d=id.data, out=new ImageData(w,h), o=out.data
  const gray=new Float32Array(w*h)
  for (let i=0;i<w*h;i++) gray[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const tl=gray[(y-1)*w+x-1],tc=gray[(y-1)*w+x],tr=gray[(y-1)*w+x+1]
    const ml=gray[y*w+x-1],mr=gray[y*w+x+1]
    const bl=gray[(y+1)*w+x-1],bc=gray[(y+1)*w+x],br=gray[(y+1)*w+x+1]
    const gx=-tl+tr-2*ml+2*mr-bl+br, gy=-tl-2*tc-tr+bl+2*bc+br
    const mag=Math.sqrt(gx*gx+gy*gy)
    const i=(y*w+x)*4
    if (mag>22) {
      const angle=Math.atan2(gy,gx), b=Math.min(255,mag*2.2)
      o[i]  =Math.min(255,((Math.sin(angle)+1)/2*b)|0)
      o[i+1]=Math.min(255,((Math.sin(angle+2.09)+1)/2*b)|0)
      o[i+2]=Math.min(255,((Math.sin(angle+4.19)+1)/2*b)|0)
      o[i+3]=255
    } else { o[i]=o[i+1]=o[i+2]=0; o[i+3]=255 }
  }
  return out
}

function fxDuotone(id, w, h) {
  const d=id.data, out=new ImageData(w,h), o=out.data
  const dark=[20,0,80], light=[255,210,0]  // deep purple → gold
  for (let i=0;i<d.length;i+=4) {
    const t=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255
    o[i]  =dark[0]+t*(light[0]-dark[0])
    o[i+1]=dark[1]+t*(light[1]-dark[1])
    o[i+2]=dark[2]+t*(light[2]-dark[2])
    o[i+3]=255
  }
  return out
}

function fxHologram(id, w, h) {
  const d=id.data, out=new ImageData(w,h), o=out.data
  for (let y=0;y<h;y++) {
    const scanDark=y%4<1
    const shift=Math.sin(y*0.25)*4|0
    for (let x=0;x<w;x++) {
      const sx=Math.max(0,Math.min(w-1,x+shift))
      const si=(y*w+sx)*4, di=(y*w+x)*4
      const gray=d[si]*.299+d[si+1]*.587+d[si+2]*.114
      const noise=(Math.random()-.5)*18
      const m=scanDark?.25:1
      o[di]  =Math.min(255,Math.max(0,(gray*.2+noise)*m))
      o[di+1]=Math.min(255,Math.max(0,(gray*.85+noise)*m))
      o[di+2]=Math.min(255,Math.max(0,(gray+40+noise)*m))
      o[di+3]=255
    }
  }
  return out
}

function fxGlitch(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data
  for (let y=0; y<h; y++) {
    const shift=Math.random()<.18?Math.floor((Math.random()-.5)*40):0
    for (let x=0; x<w; x++) {
      const sx=Math.max(0,Math.min(w-1,x+shift)), si=(y*w+sx)*4, di=(y*w+x)*4
      o[di]=d[si]; o[di+1]=d[si+1]; o[di+2]=d[si+2]; o[di+3]=255
    }
  }
  return out
}

function fxScanlines(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data
  for (let y=0; y<h; y++) {
    const dark=y%3===0
    for (let x=0; x<w; x++) {
      const i=(y*w+x)*4, g=d[i]*.299+d[i+1]*.587+d[i+2]*.114, v=dark?g*.25:g
      o[i]=o[i+1]=o[i+2]=v; o[i+3]=255
    }
  }
  return out
}

function fxEmboss(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data
  const k=[-2,-1,0,-1,1,1,0,1,2]
  for (let y=0; y<h; y++) {
    for (let x=0; x<w; x++) {
      let s=128
      for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++) {
        const py=Math.max(0,Math.min(h-1,y+ky)), px=Math.max(0,Math.min(w-1,x+kx))
        const ii=(py*w+px)*4
        s+=k[(ky+1)*3+(kx+1)]*(d[ii]*.299+d[ii+1]*.587+d[ii+2]*.114)
      }
      const i=(y*w+x)*4; s=Math.max(0,Math.min(255,s)); o[i]=o[i+1]=o[i+2]=s; o[i+3]=255
    }
  }
  return out
}

function fxRGBShift(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data, sh=10
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const i=(y*w+x)*4
    const rr=Math.max(0,Math.min(w-1,x-sh)), bb=Math.max(0,Math.min(w-1,x+sh))
    o[i]=d[(y*w+rr)*4]; o[i+1]=d[i+1]; o[i+2]=d[(y*w+bb)*4+2]; o[i+3]=255
  }
  return out
}

function fxCartoon(id, w, h) {
  const out = new ImageData(w, h), d = id.data, o = out.data, step=255/4
  for (let i=0; i<d.length; i+=4) {
    o[i]=Math.round(d[i]/step)*step
    o[i+1]=Math.round(d[i+1]/step)*step
    o[i+2]=Math.round(d[i+2]/step)*step
    o[i+3]=255
  }
  return out
}

function fxInvisible(_id, _w, _h) {
  return null  // show plain video through the border
}

function fxComic(id, w, h) {
  const d = id.data, out = new ImageData(w, h), o = out.data, step=255/3
  // Posterize
  for (let i=0; i<d.length; i+=4) {
    o[i]  =Math.round(d[i]/step)*step
    o[i+1]=Math.round(d[i+1]/step)*step
    o[i+2]=Math.round(d[i+2]/step)*step
    o[i+3]=255
  }
  // Precompute grayscale for Sobel
  const gray = new Float32Array(w*h)
  for (let i=0;i<w*h;i++) gray[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114
  // Sobel edge overlay — dark outlines
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const tl=gray[(y-1)*w+(x-1)],tc=gray[(y-1)*w+x],tr=gray[(y-1)*w+(x+1)]
    const ml=gray[y*w+(x-1)],                        mr=gray[y*w+(x+1)]
    const bl=gray[(y+1)*w+(x-1)],bc=gray[(y+1)*w+x],br=gray[(y+1)*w+(x+1)]
    const gx=-tl+tr-2*ml+2*mr-bl+br, gy=-tl-2*tc-tr+bl+2*bc+br
    if (gx*gx+gy*gy>5000) { const i=(y*w+x)*4; o[i]=o[i+1]=o[i+2]=0 }
  }
  return out
}

const EFFECTS = [
  { name: 'Pixelate',  fn: fxPixelate,  color: '#a78bfa' },
  { name: 'Noise',     fn: fxNoise,     color: '#f472b6' },
  { name: 'Neon',      fn: fxNeon,      color: '#00ffcc' },
  { name: 'Duotone',   fn: fxDuotone,   color: '#ffd000' },
  { name: 'Hologram',  fn: fxHologram,  color: '#38bdf8' },
  { name: 'Glitch',    fn: fxGlitch,    color: '#34d399' },
  { name: 'Scanlines', fn: fxScanlines, color: '#60a5fa' },
  { name: 'Emboss',    fn: fxEmboss,    color: '#fbbf24' },
  { name: 'RGB Shift', fn: fxRGBShift,  color: '#e879f9' },
  { name: 'Cartoon',   fn: fxCartoon,   color: '#4ade80' },
  { name: 'Invisible', fn: fxInvisible, color: '#94a3b8' },
  { name: 'Comic',     fn: fxComic,     color: '#f97316' },
]

function drawBorder(ctx, x, y, sw, sh, color, label) {
  const cl = 18
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, sw, sh)
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3
  for (const [cx,cy,dx,dy] of [[x,y,1,1],[x+sw,y,-1,1],[x,y+sh,1,-1],[x+sw,y+sh,-1,-1]]) {
    ctx.beginPath(); ctx.moveTo(cx+dx*cl,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*cl); ctx.stroke()
  }
  ctx.font = 'bold 12px monospace'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x+6, y+sh-24, tw+12, 20)
  ctx.fillStyle = color; ctx.fillText(label, x+12, y+sh-9)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const videoRef      = useRef(null)
  const videoCanvasRef  = useRef(null)  // video + fingertips + live border
  const effectCanvasRef = useRef(null)  // pixel effects (redrawn every frame)
  const pinCanvasRef    = useRef(null)  // pinned borders (redrawn on pin only)

  useEffect(() => {
    let active = true, animFrame = null
    let effectIndex = 0               // current live effect, cycles on each snap
    const pinnedSquares = []          // { x, y, w, h, effectIndex } — effect locked at snap, pixels stay live
    let wasPinching = false
    let lastPinTime = 0               // cooldown: prevent accidental double-pins
    let smoothed = [null, null]

    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true })

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      )
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }, audio: false,
      })
      if (!active) { landmarker.close(); return }

      const video = videoRef.current
      video.srcObject = stream
      await video.play()

      const vCanvas = videoCanvasRef.current
      const eCanvas = effectCanvasRef.current
      const pCanvas = pinCanvasRef.current
      const vCtx = vCanvas.getContext('2d', { alpha: false })
      const eCtx = eCanvas.getContext('2d')
      const pCtx = pCanvas.getContext('2d')

      function redrawPinBorders() {
        pCtx.clearRect(0,0,pCanvas.width,pCanvas.height)
        for (const sq of pinnedSquares) {
          const eff = EFFECTS[sq.effectIndex]
          drawBorder(pCtx, sq.x, sq.y, sq.w, sq.h, eff.color, eff.name)
        }
      }

      function resize() {
        const w=window.innerWidth, h=window.innerHeight
        for (const c of [vCanvas,eCanvas,pCanvas,offscreen]) { c.width=w; c.height=h }
        redrawPinBorders()
      }

      resize()
      window.addEventListener('resize', resize)

      function detect(now) {
        if (!active) return
        animFrame = requestAnimationFrame(detect)
        if (video.readyState < 2) return

        const w=vCanvas.width, h=vCanvas.height

        // 1. Draw mirrored video
        vCtx.save(); vCtx.scale(-1,1); vCtx.drawImage(video,-w,0,w,h); vCtx.restore()

        // 2. Snapshot to offscreen for pixel reads
        offCtx.drawImage(vCanvas,0,0)

        // 3. Apply effects — pinned squares + live square
        eCtx.clearRect(0,0,w,h)

        // Pinned squares — locked effect, live video pixels
        for (const sq of pinnedSquares) {
          const sx=Math.round(sq.x), sy=Math.round(sq.y)
          const sw=Math.round(sq.w), sh=Math.round(sq.h)
          if (sw<4||sh<4) continue
          try {
            const id = offCtx.getImageData(sx,sy,sw,sh)
            const pd = EFFECTS[sq.effectIndex].fn(id,sw,sh)
            if (pd) eCtx.putImageData(pd, sx,sy)
          } catch(_) {}
        }

        // 4. Landmark detection
        const results = landmarker.detectForVideo(video, now)
        const { landmarks } = results
        if (!landmarks?.length) { wasPinching=false; smoothed=[null,null]; return }

        const hands = landmarks.map((hand,i) => {
          const raw={x:1-hand[INDEX_TIP].x, y:hand[INDEX_TIP].y}
          smoothed[i]=ema(smoothed[i],raw)
          return {
            index:{x:smoothed[i].x*w, y:smoothed[i].y*h},
            pinching: dist(hand[INDEX_TIP],hand[THUMB_TIP])<PINCH_THRESHOLD,
          }
        })
        if (landmarks.length<2) smoothed[1]=null

        // 5. Fingertip dots
        for (const hand of hands) {
          vCtx.beginPath()
          vCtx.arc(hand.index.x, hand.index.y, 10, 0, Math.PI*2)
          vCtx.fillStyle = hand.pinching ? '#ffd000' : '#ff4fa3'
          vCtx.fill()
        }

        // 6. Live square — current effect, border on pCtx above pinned borders
        if (hands.length===2) {
          const [a,b]=hands
          const x=Math.min(a.index.x,b.index.x), y=Math.min(a.index.y,b.index.y)
          const sw=Math.abs(b.index.x-a.index.x), sh=Math.abs(b.index.y-a.index.y)

          const sx=Math.round(x), sy=Math.round(y)
          const isw=Math.round(sw), ish=Math.round(sh)
          if (isw>=4 && ish>=4) {
            try {
              const id = offCtx.getImageData(sx,sy,isw,ish)
              const pd = EFFECTS[effectIndex].fn(id,isw,ish)
              if (pd) eCtx.putImageData(pd, sx,sy)
            } catch(_) {}
          }

          // Live border drawn directly onto video canvas so it stays above effects
          const eff = EFFECTS[effectIndex]
          drawBorder(vCtx, x, y, sw, sh, eff.color, eff.name)

          const bothPinching = a.pinching && b.pinching
          if (bothPinching && !wasPinching && (now - lastPinTime > 800)) {
            pinnedSquares.push({ x: sx, y: sy, w: isw, h: ish, effectIndex })
            redrawPinBorders()
            effectIndex = (effectIndex + 1) % EFFECTS.length
            lastPinTime = now
          }
          wasPinching = bothPinching
        } else {
          wasPinching = false
        }
      }

      animFrame = requestAnimationFrame(detect)
      return () => window.removeEventListener('resize', resize)
    }

    init().catch(console.error)

    return () => {
      active = false
      cancelAnimationFrame(animFrame)
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <>
      <video ref={videoRef} className="hidden-video" playsInline muted />
      <canvas ref={videoCanvasRef}  className="canvas" style={{ zIndex: 1 }} />
      <canvas ref={effectCanvasRef} className="canvas" style={{ zIndex: 2, pointerEvents:'none' }} />
      <canvas ref={pinCanvasRef}    className="canvas" style={{ zIndex: 3, pointerEvents:'none' }} />
    </>
  )
}
