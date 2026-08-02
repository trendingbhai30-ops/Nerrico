// Nerrico Motion Engine (NME) — camera motion.
//
// Declares the camera vocabulary (kinds + param schemas) and the dispatch
// contract. Phase 2B implemented `zoom` and `pan` (math ported from
// cinematic.jsx's cameraTransform); the rest stay `status: 'planned'` and
// resolve to CAMERA_IDENTITY until their `apply` lands.

import { motionRegistry } from '../registry.js';
import { clamp, lerp, warnOnce } from '../utils.js';

const TAU = Math.PI * 2;

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
  status: 'implemented',
  description: 'Slow roll around a pivot point',
  directions: ['cw', 'ccw'],
  params: {
    degrees: { default: 4, description: 'Total rotation across the move' },
    holdScale: { default: 1.12, description: 'Zoom to hide corners exposed by rotation' },
    origin: { default: '50% 50%', description: 'CSS transform-origin — the rotation pivot' },
  },
  // Linear ramp 0 → ±degrees over eased t; the constant holdScale keeps the
  // corners covered for any |degrees| the default zoom can absorb (~±7° at 1.12).
  apply(t, motion) {
    const sign = motion.direction === 'ccw' ? -1 : 1;
    const p = motion.params;
    return {
      scale: 1 + (p.holdScale - 1) * motion.intensity,
      x: 0,
      y: 0,
      rotate: sign * p.degrees * t * motion.intensity,
      blur: 0,
      origin: p.origin,
    };
  },
});

motionRegistry.register('camera', {
  name: 'orbit',
  category: 'camera',
  status: 'implemented',
  description: 'Elliptical drift around the subject (parallax feel)',
  directions: ['cw', 'ccw'],
  params: {
    radiusX: { default: 24, description: 'Horizontal orbit radius in px' },
    radiusY: { default: 14, description: 'Vertical orbit radius in px' },
    revolutions: { default: 0.25, description: 'Fraction of a full orbit across the move' },
    holdScale: { default: 1.14, description: 'Zoom to hide edges exposed by the drift' },
    origin: { default: '50% 50%', description: 'CSS transform-origin — the orbit center point' },
  },
  // Parametric ellipse anchored at the start point: θ sweeps ±revolutions·2π
  // over eased t and the position is offset by (cos θ − 1, sin θ) so t=0 is
  // exactly (0, 0) — the move eases out of stillness with no mount jump, and
  // a full revolution returns home. Pure trig of eased progress: zero state,
  // zero randomness, so consecutive frames can never jitter.
  apply(t, motion) {
    const sign = motion.direction === 'ccw' ? -1 : 1;
    const p = motion.params;
    const theta = sign * p.revolutions * TAU * t;
    return {
      scale: 1 + (p.holdScale - 1) * motion.intensity,
      x: p.radiusX * (Math.cos(theta) - 1) * motion.intensity,
      y: p.radiusY * Math.sin(theta) * motion.intensity,
      rotate: 0,
      blur: 0,
      origin: p.origin,
    };
  },
});

motionRegistry.register('camera', {
  name: 'push',
  category: 'camera',
  status: 'implemented',
  description: 'Physical dolly toward/away from the subject — accelerating travel, not a linear zoom',
  directions: ['in', 'out'],
  params: {
    distancePx: { default: 300, description: 'Simulated camera travel along the lens axis' },
    perspectivePx: { default: 1200, description: 'Virtual lens distance — smaller = more dramatic acceleration' },
    origin: { default: '50% 50%', description: 'CSS transform-origin — the dolly target' },
  },
  // A camera moving at constant speed toward a flat subject magnifies it
  // hyperbolically: CSS perspective(P) translateZ(z) ≡ scale P/(P−z), so we
  // compute that scale directly (no extra transform terms). Unlike zoom's
  // linear lerp, growth accelerates as the camera closes in — the physical
  // push-in signature. 'out' runs z from distance → 0, settling back to
  // scale 1 (never below — no edge reveal). Travel is clamped to 0.85·P so
  // hostile params can't send the scale toward infinity.
  apply(t, motion) {
    const p = motion.params;
    const travel = clamp(p.distancePx * motion.intensity, 0, p.perspectivePx * 0.85);
    const z = motion.direction === 'out' ? travel * (1 - t) : travel * t;
    return {
      scale: p.perspectivePx / (p.perspectivePx - z),
      x: 0,
      y: 0,
      rotate: 0,
      blur: 0,
      origin: p.origin,
    };
  },
});

motionRegistry.register('camera', {
  name: 'shake',
  category: 'camera',
  status: 'implemented',
  description: 'Impact/handheld shake, decaying over time',
  directions: ['in'],
  params: {
    amplitudePx: { default: 9, description: 'Peak displacement in px' },
    frequency: { default: 7, description: 'Oscillation cycles across the move' },
    decay: { default: 1, description: '0 = constant, 1 = fully decays by t=1' },
    seed: { default: 7, description: 'Deterministic seed — same seed, same motion' },
    holdScale: { default: 1.03, description: 'Zoom to hide edges revealed by displacement' },
  },
  // Seeded sum-of-sines noise, NOT random(): the seed only picks the phase
  // offsets, and incommensurate frequency ratios (2.7×, 1.3×, 3.1×) keep x/y
  // from ever locking into a visible repeating pattern. Same seed → identical
  // motion on every render; a different seed is a genuinely different shake.
  // Envelope (1−t)^(3·decay) starts at full impact and (for decay>0) dies to
  // exactly 0 at t=1 — displacement, and the micro-roll with it, land at rest.
  apply(t, motion) {
    const p = motion.params;
    const env = p.amplitudePx * motion.intensity * Math.pow(1 - t, 3 * p.decay);
    const phase = p.frequency * TAU * t;
    const s1 = (p.seed * 12.9898) % TAU;
    const s2 = (p.seed * 78.233) % TAU;
    const s3 = (p.seed * 37.719) % TAU;
    return {
      scale: 1 + (p.holdScale - 1) * motion.intensity,
      x: (env * (Math.sin(phase + s1) + 0.5 * Math.sin(2.7 * phase + s2))) / 1.5,
      y: (env * (Math.cos(1.3 * phase + s3) + 0.5 * Math.sin(3.1 * phase + s1))) / 1.5,
      rotate: env * 0.05 * Math.sin(2.2 * phase + s2),
      blur: 0,
    };
  },
});

motionRegistry.register('camera', {
  name: 'focusPull',
  category: 'camera',
  status: 'implemented',
  description: 'Rack focus: blur resolving to sharp (or reverse)',
  directions: ['in', 'out'],
  params: {
    blurFrom: { default: 7, description: 'Blur in px at t=0' },
    blurTo: { default: 0, description: 'Blur in px at t=1' },
    breatheScale: { default: 1.02, description: 'Subtle lens-breathing zoom across the pull (1 = none)' },
  },
  // Lightweight depth-of-field stand-in: a full-frame gaussian blur ramp
  // (rendered as a CSS filter by useCameraMotion) plus the slight zoom real
  // lenses exhibit when racking focus ("breathing"). One GPU filter, no
  // per-pixel JS. Blur below 0.05px snaps to 0 so the sharp end of the pull
  // drops the filter entirely instead of paying for an invisible blur(0.01px).
  apply(t, motion) {
    const p = motion.params;
    const out = motion.direction === 'out';
    const blur = lerp(out ? p.blurTo : p.blurFrom, out ? p.blurFrom : p.blurTo, t) * motion.intensity;
    return {
      scale: 1 + (p.breatheScale - 1) * t * motion.intensity,
      x: 0,
      y: 0,
      rotate: 0,
      blur: blur < 0.05 ? 0 : blur,
    };
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
