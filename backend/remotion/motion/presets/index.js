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
