// Nerrico Motion Engine (NME) — public API.
//
// Import surface for everything outside motion/:
//   import { resolveMotion, motionProgress, getCameraTransform, ... } from '../motion/index.js'
//
// Importing this module also registers all built-in motions and presets
// (the category modules register on load).
//
// NOTE: Remotion hooks are intentionally NOT re-exported here — import them
// from './hooks.js' inside compositions. That keeps this entry Node-safe so
// backend code (scene planner validation, tests) can use the registry and
// resolution without pulling in React.

// Side-effect imports: populate the registry.
import './camera/index.js';
import './transitions/index.js';
import './effects/index.js';
import './presets/index.js';

export { motionRegistry, MOTION_CATEGORIES } from './registry.js';
export { resolveMotion, GLOBAL_MOTION_DEFAULTS } from './config.js';
export {
  getEasing,
  registerEasing,
  listEasings,
  motionProgress,
  secondsToFrames,
} from './timing.js';
export { CAMERA_IDENTITY, getCameraTransform, cameraTransformToCss } from './camera/index.js';
export { TRANSITION_IDENTITY, getTransitionState } from './transitions/index.js';
export { getEffectState, getParticleField } from './effects/index.js';
export { clamp, clamp01, lerp } from './utils.js';
