import React, { useState } from 'react';
import { Camera, Sliders, Hand, HelpCircle, CheckCircle2, Eye, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

const PRESETS = [
  { id:0, name:'Riso Pop-Art',   desc:'Yellow/Green solarize',  icon:'🎨' },
  { id:1, name:'Blue Xerox',     desc:'Cobalt monoprint',        icon:'🟦' },
  { id:2, name:'Comic Halftone', desc:'CMYK dot screen',         icon:'📰' },
  { id:3, name:'Thermal Glitch', desc:'Heat-map wave',           icon:'🌡️' },
  { id:4, name:'Clean AR',       desc:'Realistic 3D paper',      icon:'✨' },
];

const MESHES = [
  { id:0, name:'Origami Prism',   desc:'Angled trapezoid (as in photo)' },
  { id:1, name:'Slanted Ribbon',  desc:'Dynamic parallelogram tilt' },
  { id:2, name:'Symmetric Quad',  desc:'Even rectangular box' },
];

export default function ControlsOverlay({
  isReady, handData, fps,
  mode,        setMode,
  meshStyle,   setMeshStyle,
  useScreenUV, setUseScreenUV,
  showHandSkeleton, setShowHandSkeleton,
  dotScale,    setDotScale,
  contrast,    setContrast,
  bannerHeight,setBannerHeight,
  topFlapAngle,setTopFlapAngle,
  onCaptureSnapshot,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp,     setShowHelp]     = useState(false);
  const [flash,        setFlash]        = useState(false);

  const leftOk  = !!handData?.leftHand;
  const rightOk = !!handData?.rightHand;

  const handleSnap = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    confetti({ particleCount: 55, spread: 65, origin: { y: 0.85 } });
    onCaptureSnapshot?.();
  };

  return (
    <div className="controls-overlay-container">
      {flash && <div className="snapshot-flash-screen" />}

      {/* ── Top bar ── */}
      <header className="hud-top-bar">
        <div className="brand-badge">
          <span className="brand-title">MASK-HANDS</span>
          <span className="brand-subtitle">MediaPipe · Three.js AR</span>
        </div>

        <div className="hand-status-indicators">
          {[['Left Hand', leftOk], ['Right Hand', rightOk]].map(([label, ok]) => (
            <div key={label} className={`status-pill ${ok ? 'status-active' : 'status-inactive'}`}>
              <span className="status-dot" />
              <span>{label}</span>
            </div>
          ))}
          <div className="status-pill fps-pill">
            <span style={{ color:'#64748b' }}>FPS:</span>
            <span className="fps-value">{fps}</span>
          </div>
        </div>

        <div className="hud-action-buttons">
          <button className={`hud-icon-btn ${showSettings ? 'btn-active' : ''}`} onClick={() => setShowSettings(v => !v)} title="Settings">
            <Sliders size={18} />
          </button>
          <button className={`hud-icon-btn ${showHandSkeleton ? 'btn-active' : ''}`} onClick={() => setShowHandSkeleton(v => !v)} title="Hand guides">
            <Hand size={18} />
          </button>
          <button className="hud-icon-btn" onClick={() => setShowHelp(v => !v)} title="Help">
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* ── Center hint (when no hands) ── */}
      {isReady && !leftOk && !rightOk && (
        <div className="onboarding-guide-card">
          <div className="guide-icon-pulse"><Hand size={32} /></div>
          <h3 className="guide-title">Hold Up Both Hands</h3>
          <p className="guide-desc">Raise both hands into the camera to stretch the 3D origami ribbon!</p>
          <div className="guide-steps">
            <span className={leftOk  ? 'step-done' : 'step-pending'}>{leftOk  ? '✓ Left tracked'  : '✋ Raise left'}</span>
            <span className="step-divider">•</span>
            <span className={rightOk ? 'step-done' : 'step-pending'}>{rightOk ? '✓ Right tracked' : '✋ Raise right'}</span>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <footer className="hud-bottom-bar">
        <div className="preset-selector-row">
          {PRESETS.map(p => (
            <button key={p.id} className={`preset-card ${mode===p.id ? 'preset-card-active':''}`} onClick={() => setMode(p.id)}>
              <span className="preset-icon">{p.icon}</span>
              <div className="preset-info">
                <div className="preset-name">{p.name}</div>
                <div className="preset-desc">{p.desc}</div>
              </div>
              {mode===p.id && <CheckCircle2 size={16} className="preset-check-icon" />}
            </button>
          ))}
        </div>
        <div className="capture-bar">
          <button className="snapshot-main-btn" onClick={handleSnap}>
            <Camera size={22} /><span>SNAPSHOT</span>
          </button>
        </div>
      </footer>

      {/* ── Settings drawer ── */}
      {showSettings && (
        <aside className="settings-drawer">
          <div className="drawer-header">
            <h3 className="drawer-title">Controls</h3>
            <button className="drawer-close-btn" onClick={() => setShowSettings(false)}>✕</button>
          </div>
          <div className="drawer-content">

            <div className="control-group">
              <label className="group-label">Fold Geometry</label>
              <div className="mesh-style-grid">
                {MESHES.map(m => (
                  <button key={m.id} className={`mesh-btn ${meshStyle===m.id?'mesh-btn-active':''}`} onClick={() => setMeshStyle(m.id)}>
                    <div style={{ fontWeight:600, fontSize:'0.78rem' }}>{m.name}</div>
                    <div style={{ fontSize:'0.68rem', color:'#64748b' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="group-label">Texture Mode</label>
              <div style={{ display:'flex', gap:8 }}>
                <button className={`toggle-tab ${useScreenUV?'tab-active':''}`} onClick={() => setUseScreenUV(true)}>
                  <Eye size={13} /><span>X-Ray Window</span>
                </button>
                <button className={`toggle-tab ${!useScreenUV?'tab-active':''}`} onClick={() => setUseScreenUV(false)}>
                  <Layers size={13} /><span>Surface UV</span>
                </button>
              </div>
            </div>

            {[
              ['Banner Height', bannerHeight, setBannerHeight, 0.15, 0.85, 0.02, v => `${Math.round(v*100)}%`],
              ['Top Flap Angle', topFlapAngle, setTopFlapAngle, 0, 1.2, 0.05, v => `${Math.round((v*180)/Math.PI)}°`],
              ['Halftone Dot Scale', dotScale, setDotScale, 20, 120, 5, v => v],
              ['Contrast', contrast, setContrast, 0.8, 2.5, 0.1, v => v.toFixed(1)],
            ].map(([label, val, setter, min, max, step, fmt]) => (
              <div key={label} className="control-group">
                <div className="slider-row">
                  <span className="slider-label">{label}</span>
                  <span className="slider-val">{fmt(val)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => setter(parseFloat(e.target.value))} className="custom-range" />
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── Help modal ── */}
      {showHelp && (
        <div className="help-modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="help-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="help-title">✨ How to use Mask-Hands</h3>
            {[
              ['Hold both hands up', 'The 3D ribbon anchors between your fingertips.'],
              ['Move & twist your hands', 'Tilt, spread, or bring hands closer to deform the origami fold.'],
              ['Switch shader presets', 'Riso Pop-Art matches the iconic solarized print look from the reference photos.'],
            ].map(([t, d], i) => (
              <div key={i} className="help-item">
                <span className="help-num">{i+1}</span>
                <div><strong>{t}</strong><p>{d}</p></div>
              </div>
            ))}
            <button className="help-close-btn" onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
