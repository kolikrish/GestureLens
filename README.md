# GestureLens ✋✨

> **Real-Time Interactive Hand Tracking, AR Origami Filters, and Spatial Visual Effects Engine**

**GestureLens** is a cutting-edge web application that transforms hand gestures into dynamic visual art and interactive spatial masks. Powered by **MediaPipe Tasks Vision** for AI-driven hand landmark detection, **Three.js** for 3D origami banner folding, and custom **GLSL Shaders & Canvas 2D image processing**, GestureLens brings real-time augmented reality effects directly into your browser without external plugins.

---

## 🚀 Key Features

* ✋ **Dual-Hand Tracking & Gesture Recognition**: Real-time detection of up to 2 hands using MediaPipe `HandLandmarker` with Exponential Moving Average (EMA) position smoothing.
* 🤏 **Interactive Pinch-to-Pin**: Pinch thumb and index fingers together to lock dynamic visual filter boxes between your hands across the screen.
* 🎨 **12 Real-Time Pixel Filters**:
  * **Pixelate**: Retrospectively downsamples live video regions into retro pixel blocks.
  * **Neon**: Edge-detection based color cycling glowing outlines.
  * **Duotone**: Deep purple and radiant gold color mapping.
  * **Hologram**: Futuristic cyan scanline jitter and noise distortion.
  * **Glitch**: Dynamic horizontal line displacement.
  * **Scanlines**: Vintage CRT line rasterization.
  * **Comic & Cartoon**: Edge-detection posterization with dark outline ink strokes.
  * **Emboss, RGB Shift, Noise & Invisible mode**.
* 🖼️ **3D Origami Banner & Riso Shaders**: Render realistic 3D folded paper ribbons anchored between hands using Three.js custom GLSL shaders (Riso Pop-Art, Blue Xerox, CMYK Comic Halftone, Thermal Glitch).
* ⚙️ **Custom HUD Controls**: Fine-tune contrast, halftone dot scale, banner height, flap angles, and toggle between X-Ray Screen UV and Surface UV texture modes.
* 📸 **Snapshot & Confetti**: Capture photos instantly with screen flash and celebration confetti effects.

---

## 🛠️ Technology Stack

* **Frontend Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
* **AI Computer Vision**: [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (`HandLandmarker` model)
* **3D Graphics Engine**: [Three.js](https://threejs.org/) + Custom GLSL Shaders
* **Icons & Polish**: [Lucide React](https://lucide.dev/) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
* **Styling**: Modern Dark Theme Vanilla CSS with Glassmorphism HUD overlay

---

## 📂 Project Architecture

For an in-depth breakdown of system components, data pipelines, and shader specifications, see [architecture.md](file:///e:/hand-mask-mediapipe/architecture.md).

```
GestureLens/
├── src/
│   ├── assets/             # Brand icons and static assets
│   ├── components/         # React HUD Overlay & Controls
│   │   ├── ControlsOverlay.jsx
│   │   └── HandMaskCanvas.jsx
│   ├── services/           # MediaPipe Hand Tracking Manager
│   │   └── handTracker.js
│   ├── shaders/            # Custom GLSL Shaders for Three.js
│   │   └── risoShaders.js
│   ├── App.jsx             # Main Application, Canvas 2D Filter Engine & Frame Loop
│   ├── index.css           # Core Design Tokens & UI Stylesheet
│   └── main.jsx            # Application Entry Point
├── architecture.md         # System Architecture & Pipeline Specification
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* Web camera access in browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kolikrish/GestureLens.git
   cd GestureLens
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open the browser at `http://localhost:5173` and allow camera permissions when prompted.

---

## 🎮 How to Use

1. **Raise Both Hands**: Position both hands within the webcam view.
2. **Move & Stretch**: Move your hands closer or further apart to scale and deform live mask boundaries in real time.
3. **Pinch Gesture**: Bring your thumb and index tips together to lock/pin the active filter onto the canvas.
4. **Switch Shader Presets**: Open the **Controls** drawer to switch fold geometry styles (Origami Prism, Slanted Ribbon, Symmetric Quad) or halftone shader modes.
5. **Take Snapshots**: Click the **SNAPSHOT** button on the bottom bar to capture photos.

---

## 📜 License

Distributed under the MIT License.
