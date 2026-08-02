// Nerrico Motion Engine (NME) — timing engine.
//
// Owns easing curves and the frame→progress math every motion shares.
// Design rule: all per-frame functions here are pure number math with zero
// allocations — they run once per frame per motion across hundreds of scenes.

import { clamp01, warnOnce } from './utils.js';

// ---------------------------------------------------------------------------
// Easing curves
// ---------------------------------------------------------------------------

const linear = (t) => t;
const easeIn = (t) => t * t * t; // cubic
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** @type {Map<string, (t: number) => number>} */
const easings = new Map([
  ['linear', linear],
  ['easeIn', easeIn],
  ['easeOut', easeOut],
  ['easeInOut', easeInOut],
]);

// Accept CSS-style names so planner/LLM output like "ease-in-out" just works.
const EASING_ALIASES = { 'ease-in': 'easeIn', 'ease-out': 'easeOut', 'ease-in-out': 'easeInOut', ease: 'easeInOut' };

/**
 * Register a custom easing curve (future: cubic-bezier, spring, steps —
 * they plug in here without touching any other module).
 * @param {string} name
 * @param {(t: number) => number} fn  Must map [0,1] → ~[0,1].
 */
export function registerEasing(name, fn) {
  if (typeof fn !== 'function') throw new Error(`[motion] registerEasing("${name}"): fn required`);
  easings.set(name, fn);
  return fn;
}

/**
 * Resolve an easing name to a function. Unknown names degrade to linear with
 * a one-time warning (planner output must never crash a render).
 * @param {string} [name]
 * @returns {(t: number) => number}
 */
export function getEasing(name) {
  if (!name) return easeInOut;
  const fn = easings.get(EASING_ALIASES[name] || name);
  if (fn) return fn;
  warnOnce(`easing:${name}`, `Unknown easing "${name}" — falling back to linear`);
  return linear;
}

export function listEasings() {
  return [...easings.keys()];
}

// ---------------------------------------------------------------------------
// Progress math
// ---------------------------------------------------------------------------

/** @param {number} seconds @param {number} fps */
export function secondsToFrames(seconds, fps) {
  return Math.round(seconds * fps);
}

/**
 * Eased progress (0→1) of a resolved motion at a given frame.
 * Applies, in order: delay → speed-adjusted duration → clamp → easing.
 * Resolve the motion ONCE per scene (config.js/resolveMotion); call this
 * every frame — it allocates nothing.
 *
 * @param {import('./types.js').ResolvedMotion} motion
 * @param {number} frame     Current frame, relative to the scene's start.
 * @param {number} fps
 * @param {number} [sceneDurationInFrames]  Required when motion.durationInSeconds
 *                                          is null ("span the whole scene").
 * @returns {number} eased progress in [0, 1] (easings may overshoot by design).
 */
export function motionProgress(motion, frame, fps, sceneDurationInFrames) {
  const delayFrames = motion.delayInSeconds * fps;
  let durationFrames;
  if (motion.durationInSeconds == null) {
    durationFrames = Math.max((sceneDurationInFrames || 1) - delayFrames, 1);
  } else {
    durationFrames = Math.max(motion.durationInSeconds * fps, 1);
  }
  // speed scales time: speed 2 → progress completes in half the duration.
  const raw = ((frame - delayFrames) * (motion.speed || 1)) / durationFrames;
  return motion.easingFn(clamp01(raw));
}
