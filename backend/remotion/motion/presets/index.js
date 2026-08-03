// Nerrico Motion Engine (NME) — presets.
//
// A preset is a NAMED CONFIGURATION and nothing more: a MotionSpec with taste
// baked in. Presets are what scene planners and styles reference ("slowZoom"),
// so prompt vocabulary stays stable while implementations evolve underneath.
// Style-agnostic by design — a finance style and a documentary style can both
// use 'cinematicDrift' and only differ in what they render around it.
//
// Adding a preset = one register() call here (or in a future per-style
// preset pack that imports the registry).

import { motionRegistry } from '../registry.js';

motionRegistry.register('preset', {
  name: 'slowZoom',
  description: 'Patient push-in across the whole scene — the documentary staple',
  config: {
    category: 'camera',
    kind: 'zoom',
    direction: 'in',
    easing: 'easeInOut',
    intensity: 0.6,
    speed: 0.85,
  },
});

motionRegistry.register('preset', {
  name: 'fastZoom',
  description: 'Snappy punch-in for reveals and beat hits',
  config: {
    category: 'camera',
    kind: 'zoom',
    direction: 'in',
    durationInSeconds: 1.1,
    easing: 'easeOut',
    intensity: 1.5,
  },
});

motionRegistry.register('preset', {
  name: 'documentaryPan',
  description: 'Slow lateral glide over archival material',
  config: {
    category: 'camera',
    kind: 'pan',
    direction: 'right',
    easing: 'easeInOut',
    intensity: 0.7,
    params: { tiltPx: 8 },
  },
});

motionRegistry.register('preset', {
  name: 'cinematicDrift',
  description: 'Barely-perceptible float — keeps static frames alive',
  config: {
    category: 'camera',
    kind: 'orbit',
    direction: 'cw',
    easing: 'linear',
    intensity: 0.35,
    params: { revolutions: 0.18 },
  },
});

motionRegistry.register('preset', {
  name: 'newsPush',
  description: 'Urgent push toward a headline/document',
  config: {
    category: 'camera',
    kind: 'zoom',
    direction: 'in',
    durationInSeconds: 0.8,
    easing: 'easeOut',
    intensity: 1.2,
    speed: 1.4,
  },
});

motionRegistry.register('preset', {
  name: 'slowRoll',
  description: 'Barely-perceptible roll — quiet unease and tension',
  config: {
    category: 'camera',
    kind: 'rotate',
    direction: 'cw',
    easing: 'easeInOut',
    intensity: 0.7,
  },
});

motionRegistry.register('preset', {
  name: 'pushIn',
  description: 'Physical dolly toward the subject — mounting drama',
  config: {
    category: 'camera',
    kind: 'push',
    direction: 'in',
    easing: 'easeInOut',
    intensity: 0.8,
  },
});

motionRegistry.register('preset', {
  name: 'pullBack',
  description: 'Dolly away from the subject — reveals and aftermath',
  config: {
    category: 'camera',
    kind: 'push',
    direction: 'out',
    easing: 'easeInOut',
    intensity: 0.8,
  },
});

motionRegistry.register('preset', {
  name: 'impactShake',
  description: 'Short decaying shake — beat hits and shocking facts',
  config: {
    category: 'camera',
    kind: 'shake',
    easing: 'linear',
    durationInSeconds: 0.9,
    intensity: 0.8,
  },
});

motionRegistry.register('preset', {
  name: 'rackFocus',
  description: 'Blur resolving to sharp — openings and slow reveals',
  config: {
    category: 'camera',
    kind: 'focusPull',
    direction: 'in',
    easing: 'easeOut',
    durationInSeconds: 1.2,
  },
});

// Effect presets (Phase 2D-2) — particle moods with taste baked in. linear
// easing on purpose: particles integrate eased progress as their clock, so a
// curved easing would visibly warp drift speed across the scene.
motionRegistry.register('preset', {
  name: 'dust',
  description: 'Floating dust motes — archival stillness, sunlit rooms',
  config: {
    category: 'effect',
    kind: 'particles',
    easing: 'linear',
    params: { kind: 'dust' },
  },
});

motionRegistry.register('preset', {
  name: 'embers',
  description: 'Rising embers — fire, destruction, aftermath',
  config: {
    category: 'effect',
    kind: 'particles',
    easing: 'linear',
    params: { kind: 'embers', count: 28 },
  },
});

motionRegistry.register('preset', {
  name: 'snow',
  description: 'Falling snow — winter, cold, quiet melancholy',
  config: {
    category: 'effect',
    kind: 'particles',
    easing: 'linear',
    params: { kind: 'snow', count: 48 },
  },
});

motionRegistry.register('preset', {
  name: 'heroReveal',
  description: 'Subject slides up into place with a settle — openings, titles',
  config: {
    category: 'transition',
    kind: 'slide',
    direction: 'up',
    durationInSeconds: 0.6,
    easing: 'easeOut',
    params: { distancePct: 12, withFade: true },
  },
});
