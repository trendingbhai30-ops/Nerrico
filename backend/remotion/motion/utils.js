// Nerrico Motion Engine (NME) — shared helpers.
// Framework-free: must run in Node (tests, planners) and in Remotion's
// browser bundle (render time). No imports from src/ or remotion here.

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

// Warn exactly once per key. Planned-but-unimplemented motions degrade to a
// safe identity state; this keeps that silent-safe behavior visible in logs
// without flooding a render that evaluates the same motion on every frame.
const warned = new Set();
export function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[motion] ${message}`);
}

// Recursively freeze definitions/presets so shared registry objects can never
// be mutated by a scene at render time.
export function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) deepFreeze(value);
  }
  return obj;
}
