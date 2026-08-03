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
let total = 0;
function check(name, cond) {
  total++;
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// --- registry ---------------------------------------------------------------
console.log('registry:');
check('7 camera kinds', motionRegistry.list('camera').length === 7);
check('6 transitions', motionRegistry.list('transition').length === 6);
check('6 effects', motionRegistry.list('effect').length === 6);
check('11 presets', motionRegistry.list('preset').length === 11);
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
// (All camera kinds are implemented as of Phase 2C and all transitions as of
// Phase 2D-1 — synthetic planned kinds, registered only inside this test
// process, prove the fallback contract. Effect fallbacks still use a real
// planned kind: noise.)
console.log('dispatch:');
motionRegistry.register('camera', {
  name: 'testPlanned',
  category: 'camera',
  status: 'planned',
  description: 'test-only planned kind',
  params: {},
});
const plannedCam = resolveMotion({ category: 'camera', kind: 'testPlanned' });
check('planned camera → shared identity', getCameraTransform(plannedCam, 0.5) === CAMERA_IDENTITY);
check('identity css renders', cameraTransformToCss(CAMERA_IDENTITY) === 'scale(1) translate(0px, 0px)');
motionRegistry.register('transition', {
  name: 'testPlannedTransition',
  category: 'transition',
  status: 'planned',
  description: 'test-only planned kind',
  params: {},
});
const plannedTrans = resolveMotion({ category: 'transition', kind: 'testPlannedTransition' });
check('planned transition → shared identity', getTransitionState(plannedTrans, 0.5) === TRANSITION_IDENTITY);
const noise = resolveMotion({ category: 'effect', kind: 'noise' }); // still planned
check('planned effect → null (skip)', getEffectState(noise, 0.5) === null);
const hero = resolveMotion('heroReveal'); // transition (slide)
check('camera dispatch of non-camera motion → identity', getCameraTransform(hero, 0.5) === CAMERA_IDENTITY);

// --- implemented motions (Phase 2B: zoom, pan, fade, filmGrain) -------------------
console.log('implemented motions:');
check('zoom is implemented', motionRegistry.get('camera', 'zoom').status === 'implemented');
const zoomIn = resolveMotion({ category: 'camera', kind: 'zoom', easing: 'linear' });
const z0 = getCameraTransform(zoomIn, 0);
const z1 = getCameraTransform(zoomIn, 1);
check('zoom scales startScale → endScale', close(z0.scale, 1.06) && close(z1.scale, 1.22));
check('zoom drifts across the move', z0.y === 0 && close(z1.y, 10));
check('zoom exposes default origin', z0.origin === '50% 50%');
const zoomOut = resolveMotion({ category: 'camera', kind: 'zoom', direction: 'out', easing: 'linear' });
check('zoom out swaps the scale ramp', close(getCameraTransform(zoomOut, 0).scale, 1.22) && close(getCameraTransform(zoomOut, 1).scale, 1.06));
const strongZoom = resolveMotion({ category: 'camera', kind: 'zoom', easing: 'linear', intensity: 2 });
check('intensity scales the zoom', close(getCameraTransform(strongZoom, 1).scale, 1.44));
const focalZoom = resolveMotion({ category: 'camera', kind: 'zoom', params: { origin: '30% 20%' } });
check('zoom origin is configurable', getCameraTransform(focalZoom, 0.5).origin === '30% 20%');
check('slowZoom preset now actually moves', getCameraTransform(resolveMotion('slowZoom'), 1).scale > 1.1);

check('pan is implemented', motionRegistry.get('camera', 'pan').status === 'implemented');
const panL = resolveMotion({ category: 'camera', kind: 'pan', direction: 'left', easing: 'linear' });
check('pan left travels +x → −x', close(getCameraTransform(panL, 0).x, 30) && close(getCameraTransform(panL, 1).x, -30));
check('pan holds constant zoom', close(getCameraTransform(panL, 0).scale, 1.18) && close(getCameraTransform(panL, 1).scale, 1.18));
const panR = resolveMotion({ category: 'camera', kind: 'pan', direction: 'right', easing: 'linear' });
check('pan right mirrors left', close(getCameraTransform(panR, 0).x, -30) && close(getCameraTransform(panR, 1).x, 30));
const panU = resolveMotion({ category: 'camera', kind: 'pan', direction: 'up', easing: 'linear' });
check('pan up travels on the y axis', close(getCameraTransform(panU, 0).y, 30) && close(getCameraTransform(panU, 1).y, -30));

check('fade is implemented', motionRegistry.get('transition', 'fade').status === 'implemented');
const fadeIn = resolveMotion({ category: 'transition', kind: 'fade', easing: 'linear' });
check(
  'fade in ramps opacity 0 → 1',
  close(getTransitionState(fadeIn, 0).opacity, 0) && close(getTransitionState(fadeIn, 0.5).opacity, 0.5) && close(getTransitionState(fadeIn, 1).opacity, 1)
);
const fadeOut = resolveMotion({ category: 'transition', kind: 'fade', direction: 'out', easing: 'linear' });
check('fade out ramps opacity 1 → 0', close(getTransitionState(fadeOut, 0).opacity, 1) && close(getTransitionState(fadeOut, 1).opacity, 0));

check('filmGrain is implemented', motionRegistry.get('effect', 'filmGrain').status === 'implemented');
const grain = resolveMotion({ category: 'effect', kind: 'filmGrain' });
const g = getEffectState(grain, 0.4);
check('filmGrain returns overlay state', !!g && g.kind === 'filmGrain' && close(g.opacity, 0.1) && close(g.baseFrequency, 0.8));
check('filmGrain is deterministic', Number.isInteger(g.seed) && getEffectState(grain, 0.4).seed === g.seed && getEffectState(grain, 0.9).seed !== g.seed);
check(
  'filmGrain intensity scales, 0 disables',
  close(getEffectState(resolveMotion({ category: 'effect', kind: 'filmGrain', intensity: 2 }), 0.4).opacity, 0.2) &&
    getEffectState(resolveMotion({ category: 'effect', kind: 'filmGrain', intensity: 0 }), 0.4) === null
);

// --- Phase 2C camera library (rotate, orbit, push in/out, shake, focusPull) ------
console.log('camera library (Phase 2C):');
check('rotate is implemented', motionRegistry.get('camera', 'rotate').status === 'implemented');
const rotCw = resolveMotion({ category: 'camera', kind: 'rotate', easing: 'linear' });
check('rotate ramps 0 → degrees', getCameraTransform(rotCw, 0).rotate === 0 && close(getCameraTransform(rotCw, 1).rotate, 4));
const rotCcw = resolveMotion({ category: 'camera', kind: 'rotate', direction: 'ccw', easing: 'linear' });
check('rotate ccw mirrors cw', close(getCameraTransform(rotCcw, 1).rotate, -4));
check('rotate holds cover zoom', close(getCameraTransform(rotCw, 0).scale, 1.12) && close(getCameraTransform(rotCw, 1).scale, 1.12));
check('rotate intensity scales', close(getCameraTransform(resolveMotion({ category: 'camera', kind: 'rotate', easing: 'linear', intensity: 2 }), 1).rotate, 8));
check('rotate css includes the roll', cameraTransformToCss(getCameraTransform(rotCw, 1)).includes('rotate(4deg)'));

check('orbit is implemented', motionRegistry.get('camera', 'orbit').status === 'implemented');
const orbCw = resolveMotion({ category: 'camera', kind: 'orbit', easing: 'linear' });
const o0 = getCameraTransform(orbCw, 0);
check('orbit starts anchored at (0,0)', close(o0.x, 0) && close(o0.y, 0));
const oQ = getCameraTransform(orbCw, 1); // default 0.25 revolutions → θ = π/2
check('orbit quarter-turn lands at (−radiusX, radiusY)', close(oQ.x, -24) && close(oQ.y, 14));
const orbCcw = resolveMotion({ category: 'camera', kind: 'orbit', direction: 'ccw', easing: 'linear' });
check('orbit ccw mirrors the vertical path', close(getCameraTransform(orbCcw, 1).y, -14));
const orbFull = resolveMotion({ category: 'camera', kind: 'orbit', easing: 'linear', params: { revolutions: 1 } });
const oF = getCameraTransform(orbFull, 1);
check('full orbit returns home', close(oF.x, 0, 1e-6) && close(oF.y, 0, 1e-6));
check('cinematicDrift preset now actually moves', getCameraTransform(resolveMotion('cinematicDrift'), 0.5) !== CAMERA_IDENTITY);

check('push is implemented', motionRegistry.get('camera', 'push').status === 'implemented');
const pushIn = resolveMotion({ category: 'camera', kind: 'push', easing: 'linear' });
check('push in starts at rest', close(getCameraTransform(pushIn, 0).scale, 1));
check('push in ends at perspective magnification', close(getCameraTransform(pushIn, 1).scale, 1200 / 900));
check(
  'push accelerates (hyperbolic, not linear)',
  getCameraTransform(pushIn, 0.5).scale - 1 < (getCameraTransform(pushIn, 1).scale - 1) / 2
);
const pullOut = resolveMotion({ category: 'camera', kind: 'push', direction: 'out', easing: 'linear' });
check('pull out runs magnified → rest', close(getCameraTransform(pullOut, 0).scale, 1200 / 900) && close(getCameraTransform(pullOut, 1).scale, 1));
check('pull out never dips below 1 (no edge reveal)', getCameraTransform(pullOut, 0.5).scale >= 1);
const hostilePush = resolveMotion({ category: 'camera', kind: 'push', easing: 'linear', params: { distancePx: 99999 } });
check('push travel is clamped (no infinite scale)', getCameraTransform(hostilePush, 1).scale < 7);

check('shake is implemented', motionRegistry.get('camera', 'shake').status === 'implemented');
const shake = resolveMotion({ category: 'camera', kind: 'shake', easing: 'linear' });
const s0 = getCameraTransform(shake, 0);
check('shake starts displaced (impact)', Math.abs(s0.x) + Math.abs(s0.y) > 0.5);
const sEnd = getCameraTransform(shake, 1);
check('shake decays to exact rest', sEnd.x === 0 && sEnd.y === 0 && sEnd.rotate === 0);
check('shake is deterministic (same seed, same frame)', getCameraTransform(shake, 0.3).x === getCameraTransform(shake, 0.3).x && getCameraTransform(shake, 0.3).y === getCameraTransform(shake, 0.3).y);
const shakeSeed9 = resolveMotion({ category: 'camera', kind: 'shake', easing: 'linear', params: { seed: 9 } });
check('different seed → different motion', !close(getCameraTransform(shakeSeed9, 0.3).x, getCameraTransform(shake, 0.3).x, 1e-6));
const shakeFlat = resolveMotion({ category: 'camera', kind: 'shake', easing: 'linear', params: { decay: 0 } });
check('decay 0 keeps shaking at full amplitude', Math.abs(getCameraTransform(shakeFlat, 1).x) + Math.abs(getCameraTransform(shakeFlat, 1).y) > 0.5);

check('focusPull is implemented', motionRegistry.get('camera', 'focusPull').status === 'implemented');
const rack = resolveMotion({ category: 'camera', kind: 'focusPull', easing: 'linear' });
check('focus pull resolves blur 7 → 0', close(getCameraTransform(rack, 0).blur, 7) && getCameraTransform(rack, 1).blur === 0);
check('sub-0.05px blur snaps to 0 (filter dropped)', getCameraTransform(rack, 0.999).blur === 0);
const rackOut = resolveMotion({ category: 'camera', kind: 'focusPull', direction: 'out', easing: 'linear' });
check('focus pull out defocuses 0 → 7', getCameraTransform(rackOut, 0).blur === 0 && close(getCameraTransform(rackOut, 1).blur, 7));
check('lens breathing zooms across the pull', close(getCameraTransform(rack, 1).scale, 1.02));
check('focusPull intensity scales the blur', close(getCameraTransform(resolveMotion({ category: 'camera', kind: 'focusPull', easing: 'linear', intensity: 0.5 }), 0).blur, 3.5));

// --- Phase 2D-1 transition library (slide, whip, flash, paperReveal, morph) ------
console.log('transition library (Phase 2D-1):');
const asOut = (m) => ({ ...m, direction: 'out' }); // how hooks.js drives the 'out' phase

check('slide is implemented', motionRegistry.get('transition', 'slide').status === 'implemented');
const slideDefault = resolveMotion({ category: 'transition', kind: 'slide', easing: 'linear' });
const sd0 = getTransitionState(slideDefault, 0);
check('slide non-spatial direction falls back to up (enters from below)', sd0.transform === 'translate(0.000%, 100.000%)');
check('slide starts invisible with fade, settles fully visible', close(sd0.opacity, 0) && getTransitionState(slideDefault, 1).transform === '' && close(getTransitionState(slideDefault, 1).opacity, 1));
const slideLeft = resolveMotion({ category: 'transition', kind: 'slide', direction: 'left', easing: 'linear' });
check('slide left travels on the x axis', getTransitionState(slideLeft, 0).transform === 'translate(100.000%, 0.000%)');
check('slide fade completes at ~70% of the travel (arrives, not appears)', close(getTransitionState(slideDefault, 0.75).opacity, 1) && getTransitionState(slideDefault, 0.75).transform !== '');
const slideNoFade = resolveMotion({ category: 'transition', kind: 'slide', easing: 'linear', params: { withFade: false } });
check('slide withFade:false keeps full opacity', close(getTransitionState(slideNoFade, 0).opacity, 1));
check('slide out retraces its entrance', getTransitionState(asOut(slideDefault), 0).transform === '' && getTransitionState(asOut(slideDefault), 1).transform === 'translate(0.000%, 100.000%)');
check('slide intensity scales the travel', getTransitionState(resolveMotion({ category: 'transition', kind: 'slide', easing: 'linear', intensity: 0.5 }), 0).transform === 'translate(0.000%, 50.000%)');

check('whip is implemented', motionRegistry.get('transition', 'whip').status === 'implemented');
const whip = resolveMotion({ category: 'transition', kind: 'whip', easing: 'linear' });
const w0 = getTransitionState(whip, 0);
const wMid = getTransitionState(whip, 0.5);
const w1 = getTransitionState(whip, 1);
check('whip starts a full frame off, no blur at rest', w0.transform === 'translate(100.000%, 0%)' && w0.filter === '' && w0.filterDef === null);
check('whip blur peaks mid-move via the parabola', wMid.filter === 'url(#nme-whip-blur)' && !!wMid.filterDef && close(wMid.filterDef.x, 26) && wMid.filterDef.y === 0);
check('whip lands clean (no transform, no filter)', w1.transform === '' && w1.filter === '' && w1.filterDef === null);
check('whip stays fully opaque throughout', close(w0.opacity, 1) && close(wMid.opacity, 1));
const whipRight = resolveMotion({ category: 'transition', kind: 'whip', direction: 'right', easing: 'linear' });
check('whip right enters from the left side', getTransitionState(whipRight, 0).transform === 'translate(-100.000%, 0%)');

check('flash is implemented', motionRegistry.get('transition', 'flash').status === 'implemented');
const flash = resolveMotion({ category: 'transition', kind: 'flash', easing: 'linear' });
check('flash never hides the scene', close(getTransitionState(flash, 0).opacity, 1) && close(getTransitionState(flash, 0.3).opacity, 1));
check('flash overlay is null at both endpoints', getTransitionState(flash, 0).overlay === null && getTransitionState(flash, 1).overlay === null);
const fPeak = getTransitionState(flash, 0.3);
check('flash peaks at 30% with the configured color/strength', !!fPeak.overlay && fPeak.overlay.color === '#FFFFFF' && close(fPeak.overlay.opacity, 0.9));
check('flash decays past the peak (pop then linger)', getTransitionState(flash, 0.6).overlay.opacity < fPeak.overlay.opacity && getTransitionState(flash, 0.6).overlay.opacity > 0);
check('flash intensity scales the wash', close(getTransitionState(resolveMotion({ category: 'transition', kind: 'flash', easing: 'linear', intensity: 0.5 }), 0.3).overlay.opacity, 0.45));

check('paperReveal is implemented', motionRegistry.get('transition', 'paperReveal').status === 'implemented');
const paper = resolveMotion({ category: 'transition', kind: 'paperReveal', easing: 'linear' });
const p0 = getTransitionState(paper, 0);
const pMid = getTransitionState(paper, 0.5);
check('paperReveal clips with a torn polygon mid-sweep', pMid.clipPath.startsWith('polygon(') && pMid.clipPath.includes('%'));
check('paperReveal edge starts fully off-frame', p0.clipPath.startsWith('polygon(') && close(p0.opacity, 1));
check('paperReveal completes to the SHARED identity (clip dropped)', getTransitionState(paper, 1) === TRANSITION_IDENTITY);
check('paperReveal tear is deterministic', getTransitionState(paper, 0.5).clipPath === pMid.clipPath);
const paperUp = resolveMotion({ category: 'transition', kind: 'paperReveal', direction: 'up', easing: 'linear' });
check('paperReveal direction changes the sweep', getTransitionState(paperUp, 0.5).clipPath !== pMid.clipPath);

check('morph is implemented', motionRegistry.get('transition', 'morph').status === 'implemented');
const morph = resolveMotion({ category: 'transition', kind: 'morph', easing: 'linear' });
const m0 = getTransitionState(morph, 0);
check('morph arrives oversized and soft', m0.transform === 'scale(1.1500)' && m0.filter === 'blur(8.00px)' && close(m0.opacity, 0));
const mMid = getTransitionState(morph, 0.5);
check('morph settles scale/blur while fade is already done', mMid.transform === 'scale(1.0750)' && mMid.filter === 'blur(4.00px)' && close(mMid.opacity, 1));
check('morph sub-0.5px blur snaps off before the scale settles', getTransitionState(morph, 0.95).filter === '' && getTransitionState(morph, 0.95).transform !== '');
check('morph completes to the SHARED identity', getTransitionState(morph, 1) === TRANSITION_IDENTITY);
check('morph intensity scales the settle', getTransitionState(resolveMotion({ category: 'transition', kind: 'morph', easing: 'linear', intensity: 2 }), 0).transform === 'scale(1.3000)');

check('TRANSITION_IDENTITY carries the 2D-1 fields, frozen', Object.isFrozen(TRANSITION_IDENTITY) && TRANSITION_IDENTITY.clipPath === '' && TRANSITION_IDENTITY.overlay === null && TRANSITION_IDENTITY.filterDef === null);

// Every camera preset the planner is offered must resolve to an implemented kind.
const cameraPresets = motionRegistry
  .list('preset')
  .map((name) => resolveMotion(name))
  .filter((m) => m.category === 'camera');
check('10 camera presets in planner vocabulary', cameraPresets.length === 10);
check('every camera preset resolves implemented', cameraPresets.every((m) => m.def?.status === 'implemented'));
check('heroReveal now resolves to an implemented transition (surfaces in prompt)', resolveMotion('heroReveal').def?.status === 'implemented');
check('every transition in the registry is implemented (Phase 2D-1)', motionRegistry.list('transition').filter((n) => n !== 'testPlannedTransition').every((n) => motionRegistry.get('transition', n).status === 'implemented'));

// --- perf sanity: fallback path allocates no new identity objects ---------------
console.log('perf:');
const a = getCameraTransform(plannedCam, 0.1);
const b = getCameraTransform(plannedCam, 0.9);
check('identity is reused, not re-created', a === b);

console.log(GLOBAL_MOTION_DEFAULTS.easing === 'easeInOut' ? '\ndefaults: easeInOut ✓' : '\ndefaults changed!');
if (failures) {
  console.error(`\n${failures}/${total} FAILURE(S)`);
  process.exit(1);
}
console.log(`ALL ${total} MOTION ENGINE CHECKS PASSED`);
