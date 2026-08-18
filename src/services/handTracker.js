import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

class HandTrackerService {
  constructor() {
    this.handLandmarker  = null;
    this.isReady         = false;
    this.isInitializing  = false;
    this.lastVideoTime   = -1;
    this.lastResults     = null;
    this.smoothed = { left: null, right: null, alpha: 0.35 };
  }

  async init() {
    if (this.isReady || this.isInitializing) return;
    this.isInitializing = true;

    const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
    const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

    for (const delegate of ['GPU', 'CPU']) {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions:              { modelAssetPath: MODEL, delegate },
          runningMode:              'VIDEO',
          numHands:                 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
        });
        this.isReady = true;
        this.isInitializing = false;
        console.log(`MediaPipe HandLandmarker ready (${delegate})`);
        return;
      } catch (err) {
        console.warn(`Delegate ${delegate} failed:`, err);
      }
    }
    this.isInitializing = false;
    throw new Error('Could not initialize MediaPipe HandLandmarker on any delegate');
  }

  detectHands(video) {
    if (!this.isReady || !this.handLandmarker || !video || video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return this._format(this.lastResults);

    this.lastVideoTime = video.currentTime;
    this.lastResults   = this.handLandmarker.detectForVideo(video, performance.now());
    return this._format(this.lastResults);
  }

  _format(results) {
    if (!results?.landmarks?.length) {
      this.smoothed.left  = null;
      this.smoothed.right = null;
      return { handsDetected: 0, leftHand: null, rightHand: null, distance: 0, center: null, angle: 0 };
    }

    // Sort by screen X so leftmost = left hand
    const parsed = results.landmarks
      .map((lm, i) => this._parseHand(lm, results.handednesses?.[i]))
      .sort((a, b) => a.graspPoint.x - b.graspPoint.x);

    const left  = parsed[0] ? this._smooth('left',  parsed[0]) : null;
    const right = parsed[1] ? this._smooth('right', parsed[1]) : null;

    let distance = 0, center = null, angle = 0;
    if (left && right) {
      const dx = right.graspPoint.x - left.graspPoint.x;
      const dy = right.graspPoint.y - left.graspPoint.y;
      distance = Math.hypot(dx, dy);
      center   = { x: (left.graspPoint.x + right.graspPoint.x) / 2,
                   y: (left.graspPoint.y + right.graspPoint.y) / 2,
                   z: ((left.graspPoint.z||0) + (right.graspPoint.z||0)) / 2 };
      angle    = Math.atan2(dy, dx);
    }

    return { handsDetected: parsed.length, leftHand: left, rightHand: right,
             distance, center, angle };
  }

  _parseHand(lm, handedness) {
    const wrist      = lm[0];
    const thumbTip   = lm[4];
    const indexTip   = lm[8];
    const middleTip  = lm[12];
    const indexMcp   = lm[5];
    const pinkyMcp   = lm[17];

    const graspPoint = {
      x: indexTip.x * 0.6 + thumbTip.x * 0.4,
      y: indexTip.y * 0.6 + thumbTip.y * 0.4,
      z: (indexTip.z||0) * 0.6 + (thumbTip.z||0) * 0.4,
    };

    const up = {
      x: middleTip.x - wrist.x,
      y: middleTip.y - wrist.y,
      z: (middleTip.z||0) - (wrist.z||0),
    };
    const len = Math.hypot(up.x, up.y, up.z) || 1;
    const upVector = { x: up.x/len, y: up.y/len, z: up.z/len };

    return { graspPoint, upVector, rawLandmarks: lm,
             handedness: handedness?.[0]?.categoryName || 'Unknown',
             centerX: graspPoint.x };
  }

  _smooth(side, current) {
    const prev = this.smoothed[side];
    if (!prev) { this.smoothed[side] = current; return current; }

    const a = this.smoothed.alpha;
    const l = (a, b) => a + (b - a) * a;
    const lerp = (p, c) => ({
      x: p.x + (c.x - p.x) * a,
      y: p.y + (c.y - p.y) * a,
      z: (p.z||0) + ((c.z||0) - (p.z||0)) * a,
    });

    const s = {
      ...current,
      graspPoint: lerp(prev.graspPoint, current.graspPoint),
      upVector:   lerp(prev.upVector,   current.upVector),
    };
    this.smoothed[side] = s;
    return s;
  }

  /** Simulated data for demo / testing without a camera. */
  generateSimulatedHands(t = 0) {
    const lx = 0.25 + Math.sin(t * 1.2) * 0.05;
    const ly = 0.50 + Math.cos(t * 0.9) * 0.08;
    const rx = 0.75 + Math.cos(t * 1.0) * 0.05;
    const ry = 0.45 + Math.sin(t * 1.1) * 0.09;

    const makeLandmarks = (cx, cy) =>
      Array.from({ length: 21 }, (_, i) => ({
        x: cx + (i % 5) * 0.01,
        y: cy + Math.floor(i / 5) * -0.02,
        z: 0
      }));

    return {
      handsDetected: 2,
      leftHand:  { graspPoint: { x:lx, y:ly, z:0 }, upVector: { x:0, y:-1, z:0 }, rawLandmarks: makeLandmarks(lx,ly), centerX: lx },
      rightHand: { graspPoint: { x:rx, y:ry, z:0 }, upVector: { x:0, y:-1, z:0 }, rawLandmarks: makeLandmarks(rx,ry), centerX: rx },
      distance: Math.hypot(rx-lx, ry-ly),
      center: { x:(lx+rx)/2, y:(ly+ry)/2, z:0 },
      angle: Math.atan2(ry-ly, rx-lx),
    };
  }
}

export const handTracker = new HandTrackerService();
