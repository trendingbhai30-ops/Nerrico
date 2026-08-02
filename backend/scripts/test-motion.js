// Smoke test for the Nerrico Motion Engine (NME) — Phase 2A contracts.
// Run from backend/:  node scripts/test-motion.js
// Pure Node, no Remotion/browser needed (hooks.js is deliberately excluded
// from the public index for exactly this reason).

import {
  CAMERA_IDENTITY,
  GLOBAL_MOTION_DEFAULTS,
  TRANSITION_IDENTITY,
  cameraTransformToCss,
  getCameraTransform,
  getEasing,
  getEffectState,
  getTransitionState,
  listEasings,
  motionProgress,
  motionRegistry,
  registerEasing,
  resolveMotion,
} from '../remotion/motion/index.js';

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// --- registry ---------------------------------------------------------------
console.log('registry:');
check('6 camera kinds', motionRegistry.list('camera').length === 6);
check('6 transitions', motionRegistry.list('transition').length === 6);
check('6 effects', motionRegistry.list('effect').length === 6);
check('6 presets', motionRegistry.list('preset').length === 6);
check('get() returns frozen defs', Object.isFrozen(motionRegistry.get('camera', 'zoom')));
check('unknown name → null', motionRegistry.get('camera', 'dollyZoom') === null);
let threw = false;
try {
  motionRegistry.register('camera', { name: 'zoom', category: 'camera', status: 'planned', params: {} });
} catch {
  threw = true;
}
check('duplicate registration throws', threw);
threw = false;
try {
  motionRegistry.list('nonsense');
} catch {
  threw = true;
}
check('unknown category throws', threw);

// --- easing / timing ----------------------------------------------------------
console.log('timing:');
const io = getEasing('easeInOut');
check('easeInOut endpoints', io(0) === 0 && io(1) === 1 && close(io(0.5), 0.5));
check('easeIn is slow early', getEasing('easeIn')(0.5) < 0.5);
check('easeOut is fast early', getEasing('easeOut')(0.5) > 0.5);
check('css alias ease-in-out', getEasing('ease-in-out') === io);
check('unknown easing falls back (no throw)', typeof getEasing('bouncy')(0.5) === 'number');
registerEasing('half', (t) => t / 2);
check('custom easing registers', getEasing('half')(1) === 0.5 && listEasings().includes('half'));

// --- resolution ---------------------------------------------------------------
console.log('resolveMotion:');
const slow = resolveMotion('slowZoom'); // string shorthand
check('preset shorthand resolves', slow.kind === 'zoom' && slow.category === 'camera');
check('preset config applied', slow.intensity === 0.6 && slow.easing === 'easeInOut');
check('definition param defaults merged', slow.params.startScale === 1.06 && slow.params.driftY === 10);
check('global defaults fill gaps', slow.delayInSeconds === 0 && slow.durationInSeconds === null);
check('resolved motion is frozen', Object.isFrozen(slow) && Object.isFrozen(slow.params));

const custom = resolveMotion({ preset: 'documentaryPan', intensity: 2, params: { distancePx: 90 } });
check('per-use override beats preset', custom.intensity === 2);
check('per-use param beats definition', custom.params.distancePx === 90);
check('preset param survives override merge', custom.params.tiltPx === 8);

const unknownPreset = resolveMotion('doesNotExist');
check('unknown preset → safe defaults, no throw', unknownPreset.def === null && unknownPreset.intensity === 1);
const unknownKind = resolveMotion({ category: 'camera', kind: 'dollyZoom' });
check('unknown kind → def null, no throw', unknownKind.def === null);
const zeroSpeed = resolveMotion({ preset: 'slowZoom', speed: 0 });
check('speed 0 guarded to 1', zeroSpeed.speed === 1);

// --- progress math --------------------------------------------------------------
console.log('motionProgress:');
const linearFull = resolveMotion({ category: 'camera', kind: 'zoom', easing: 'linear' });
check('spans scene when duration null', close(motionProgress(linearFull, 45, 30, 90), 0.5));
check('clamps at end', motionProgress(linearFull, 200, 30, 90) === 1);
const delayed = resolveMotion({ category: 'camera', kind: 'zoom', easing: 'linear', durationInSeconds: 2, delayInSeconds: 1 });
check('delay holds at 0', motionProgress(delayed, 15, 30) === 0);
check('delay then progresses', close(motionProgress(delayed, 60, 30), 0.5)); // 1s delay + 1s into 2s
const fast = resolveMotion({ category: 'camera', kind: 'zoom', easing: 'linear', durationInSeconds: 2, speed: 2 });
check('speed halves effective duration', motionProgress(fast, 30, 30) === 1);

// --- dispatch fallbacks -----------------------------------------------------------
console.log('dispatch:');
check('planned camera → shared identity', getCameraTransform(slow, 0.5) === CAMERA_IDENTITY);
check('identity css renders', cameraTransformToCss(CAMERA_IDENTITY) === 'scale(1) translate(0px, 0px)');
const hero = resolveMotion('heroReveal');
check('planned transition → shared identity', getTransitionState(hero, 0.5) === TRANSITION_IDENTITY);
const grain = resolveMotion({ category: 'effect', kind: 'filmGrain' });
check('planned effect → null (skip)', getEffectState(grain, 0.5) === null);
check('camera dispatch of non-camera motion → identity', getCameraTransform(hero, 0.5) === CAMERA_IDENTITY);

// --- perf sanity: per-frame path allocates no new identity objects ---------------
console.log('perf:');
const a = getCameraTransform(slow, 0.1);
const b = getCameraTransform(slow, 0.9);
check('identity is reused, not re-created', a === b);

console.log(GLOBAL_MOTION_DEFAULTS.easing === 'easeInOut' ? '\ndefaults: easeInOut ✓' : '\ndefaults changed!');
if (failures) {
  console.error(`\n${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('ALL MOTION ENGINE CHECKS PASSED');
