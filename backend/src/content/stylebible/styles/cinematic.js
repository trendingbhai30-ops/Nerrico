// Style Bible — "cinematic": the production look Nerrico ships today
// (dark moody documentary reels, photoreal AI stills, serif captions).
// This is the DEFAULT visual style for the cinematic render style, so its
// rules codify — not change — the proven reference look.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'cinematic',
  displayName: 'Cinematic Documentary',
  description: 'Premium story-driven look — photoreal stills, dark moody grade, slow deliberate camera',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'Every frame is a film still that could hang on a wall. The viewer must understand the story with the sound off — images carry the narrative, captions only punctuate it. Drama comes from light and composition, never from clutter.',

  composition: [
    'ONE clear subject per frame — a face, an object, a place. Never a busy montage.',
    'Strong foreground/background separation with shallow depth of field.',
    'Use symbolic objects for abstract ideas (vintage newspapers, keys, stacks of cash, empty stores, a sinking paper boat for a failing company).',
    'Vertical 9:16 composition — headroom tight, subject in the middle or lower third.',
  ],
  framing: [
    'Alternate scale across shots: close-up → wide → detail. Never two identical framings in a row.',
    'Low angles for power and threat, eye level for intimacy, high wide shots for aftermath and scale.',
    'Close-ups of hands and faces for emotional beats; city skylines and interiors for context beats.',
  ],

  cameraBehaviour:
    'The camera moves like a patient documentary rig: slow pushes toward meaning, drifting holds on stillness, a single hard punch-in only on the biggest beat of the story.',
  motion: {
    pace: 'slow',
    cameraPresets: ['slowZoom', 'documentaryPan', 'pushIn', 'rackFocus', 'cinematicDrift', 'impactShake'],
    transitions: ['fade', 'morph', 'flash'],
    effects: ['filmGrain', 'vignette', 'dust'],
    transitionFrequency: 'roughly 1 in 3 shots, where a softer entrance helps; straight cuts otherwise',
    effectFrequency: 'only when a shot needs extra texture (archival flashback, decay); the grade already carries the look',
  },

  colorPalette: {
    description: 'Dark cinematic grade — deep shadows, desaturated midtones, one warm light source',
    tones: ['deep charcoal shadows', 'desaturated teal-slate midtones', 'warm amber highlights'],
    accent: 'filmic red (reserved for the single most dramatic element)',
  },
  lighting: [
    'Single motivated light source — a window, a desk lamp, a neon sign.',
    'Chiaroscuro: let shadows swallow everything that does not matter.',
    'Volumetric haze or dust in light beams for depth.',
    'Golden-hour or tungsten warmth against cool darkness.',
  ],

  typography: {
    captionStyle: 'sparse elegant serif, small caps feel, high contrast over the image',
    rules: [
      'Captions are punchy fragments of 0-6 words ("In 2000", "closed 1000 stores") — never sentences.',
      'Give a caption to roughly 2 of every 3 shots; leave it empty when the image speaks for itself.',
      'Emphasis tint is reserved for 0-2 words that carry the beat.',
    ],
  },

  imagePrompt: {
    medium: 'photorealistic cinematic film still',
    prefix: 'cinematic film still, photorealistic',
    suffix: 'shallow depth of field, volumetric light, film grain, 35mm photograph',
    vocabulary: [
      'weathered face in dramatic light',
      'symbolic object close-up',
      'vintage newspaper on a desk',
      'rain-soaked city street at night',
      'empty interior with a single light source',
      'hands holding something meaningful',
      'silhouette against a bright window',
    ],
    rules: [
      'Describe ONE photorealistic cinematic image: main subject, setting, composition (close-up / wide / low angle), lighting and mood.',
      'Concrete and visual — a film still, not a diagram or infographic.',
      'Vertical composition suited to a 9:16 frame.',
      'Characters and places must RECUR across shots — describe the same protagonist consistently every time (e.g. "the same middle-aged businessman in a dark suit").',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'split screens or multi-panel collages',
    'cartoon or clip-art rendering',
    'borders and picture frames around the image',
  ],

  consistency: {
    rules: [
      'One protagonist, one visual world: recurring characters and places must be described with the same wording in every shot that shows them.',
      'The grade never changes mid-video — every shot shares the same palette and grain.',
      'Metaphoric imagery is welcome but must stay inside the established world (no style jumps).',
    ],
    promptAnchors: ['dark moody cinematic grade', 'deep shadows with warm highlights'],
  },
});
