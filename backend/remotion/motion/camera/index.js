// Nerrico Motion Engine (NME) — camera motion.
//
// Declares the camera vocabulary (kinds + param schemas) and the dispatch
// contract. Phase 2B implemented `zoom` and `pan` (math ported from
// cinematic.jsx's cameraTransform); the rest stay `status: 'planned'` and
// resolve to CAMERA_IDENTITY until their `apply` lands.

import { motionRegistry } from '../registry.js';
import { lerp, warnOnce } from '../utils.js';

/** Neutral camera state. Shared frozen instance — never mutate, never clone per frame. */
export const CAMERA_IDENTITY = Object.freeze({ scale: 1, x: 0, y: 0, rotate: 0, blur: 0 });

// --- camera vocabulary (config only; `apply` comes in Phase 2B) -------------

motionRegistry.register('camera', {
  name: 'zoom',
  category: 'camera',
  status: 'implemented',
  description: 'Scale in/out around a focal point (Ken Burns core move)',
  directions: ['in', 'out'],
  params: {
    startScale: { default: 1.06, description: 'Scale at t=0' },
    endScale: { default: 1.22, description: 'Scale at t=1 (swapped for direction "out")' },
    driftY: { default: 10, description: 'Vertical drift in px across the move' },
    origin: { default: '50% 50%', description: 'CSS transform-origin — the zoom focal point' },
  },
  // Ported from cinematic.jsx cameraTransform(): zoomIn was
  // scale = 1 + (0.06 + 0.16t)·amp, y = 10t·amp — identical here at defaults
  // with intensity as amp. Direction 'out' swaps the scale ramp and inverts drift.
  apply(t, motion) {
    const p = motion.params;
    const out = motion.direction === 'out';
    const from = out ? p.endScale : p.startScale;
    const to = out ? p.startScale : p.endScale;
    return {
      scale: 1 + (from - 1 + (to - from) * t) * motion.intensity,
      x: 0,
      y: (out ? -0.8 : 1) * p.driftY * t * motion.intensity,
      rotate: 0,
      blur: 0,
      origin: p.origin,
    };
  },
});

motionRegistry.register('camera', {
  name: 'pan',
  category: 'camera',
  status: 'implemented',
  description: 'Lateral/vertical glide at constant slight zoom',
  directions: ['left', 'right', 'up', 'down'],
  params: {
    distancePx: { default: 60, description: 'Total travel in px' },
    holdScale: { default: 1.18, description: 'Constant zoom while panning' },
    tiltPx: { default: 6, description: 'Perpendicular drift for a hand-held feel' },
  },
  // Ported from cinematic.jsx cameraTransform(): panLeft was
  // scale = 1 + 0.18·amp, x = (30 − 60t)·amp, y = 6t·amp — i.e. the frame
  // travels distancePx across the move, centered on 0, at a constant hold zoom.
  apply(t, motion) {
    const p = motion.params;
    const half = (p.distancePx / 2) * motion.intensity;
    const travel = lerp(half, -half, t);
    const tilt = p.tiltPx * t * motion.intensity;
    let x, y;
    switch (motion.direction) {
      case 'left':
        x = travel; y = tilt; break;
      case 'up':
        x = tilt; y = travel; break;
      case 'down':
        x = tilt; y = -travel; break;
      case 'right':
      default:
        x = -travel; y = tilt; break;
    }
    return {
      scale: 1 + (p.holdScale - 1) * motion.intensity,
      x,
      y,
      rotate: 0,
      blur: 0,
    };
  },
});

motionRegistry.register('camera', {
  name: 'rotate',
  category: 'camera',
  status: 'planned',
  description: 'Slow roll around the frame center',
  directions: ['cw', 'ccw'],
  params: {
    degrees: { default: 4, description: 'Total rotation across the move' },
    holdScale: { default: 1.12, description: 'Zoom to hide corners exposed by rotation' },
  },
});

motionRegistry.register('camera', {
  name: 'orbit',
  category: 'camera',
  status: 'planned',
  description: 'Elliptical drift around the subject (parallax feel)',
  directions: ['cw', 'ccw'],
  params: {
    radiusX: { default: 24, description: 'Horizontal orbit radius in px' },
    radiusY: { default: 14, description: 'Vertical orbit radius in px' },
    revolutions: { default: 0.25, description: 'Fraction of a full orbit across the move' },
  },
});

motionRegistry.register('camera', {
  name: 'shake',
  category: 'camera',
  status: 'planned',
  description: 'Impact/handheld shake, decaying over time',
  directions: ['in'],
  params: {
    amplitudePx: { default: 9, description: 'Peak displacement in px' },
    frequency: { default: 2.4, description: 'Oscillations per second' },
    decay: { default: 1, description: '0 = constant, 1 = fully decays by t=1' },
  },
});

motionRegistry.register('camera', {
  name: 'focusPull',
  category: 'camera',
  status: 'planned',
  description: 'Rack focus: blur resolving to sharp (or reverse)',
  directions: ['in', 'out'],
  params: {
    blurFrom: { default: 7, description: 'Blur in px at t=0' },
    blurTo: { default: 0, description: 'Blur in px at t=1' },
  },
});

// --- dispatch ----------------------------------------------------------------

/**
 * Camera frame state for a resolved motion at eased progress `t`.
 * Planned/unknown kinds return CAMERA_IDENTITY — callers never null-check.
 * @param {import('../types.js').ResolvedMotion} motion
 * @param {number} t
 * @returns {import('../types.js').CameraTransform}
 */
export function getCameraTransform(motion, t) {
  const def = motion.def;
  if (!def || def.category !== 'camera') return CAMERA_IDENTITY;
  if (!def.apply) {
    warnOnce(`camera-stub:${def.name}`, `Camera "${def.name}" is planned but not implemented — identity`);
    return CAMERA_IDENTITY;
  }
  return def.apply(t, motion);
}

/**
 * CSS transform string for a camera state. The one unavoidable per-frame
 * allocation (the string itself); keep all other per-frame work numeric.
 * @param {import('../types.js').CameraTransform} c
 */
export function cameraTransformToCss(c) {
  let css = `scale(${c.scale}) translate(${c.x}px, ${c.y}px)`;
  if (c.rotate) css += ` rotate(${c.rotate}deg)`;
  return css;
}
