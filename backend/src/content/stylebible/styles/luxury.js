// Style Bible — "luxury": premium charcoal, cream & gold. The visual codex for
// the 'luxury' render style — elegant serif typography, generous whitespace,
// thin gold rules, slow cinematic zooms. Restraint reads as expense.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'luxury',
  displayName: 'Luxury Minimal',
  description: 'Premium charcoal, cream & gold — elegant serif type, generous space, slow cinematic zooms',
  status: 'active',
  renderStyle: 'luxury',

  philosophy:
    'Expense is expressed as restraint. Every element earns its place, whitespace is the most expensive material, and a single gold line says more than any flourish. Slow, deliberate, and quiet — the pace of a boutique, not a billboard.',

  composition: [
    'Generous negative space around a single elegant element — never crowd the frame.',
    'One thin gold rule as the only ornament; alignment does the rest of the work.',
    'Serif headlines given room to breathe, weighted low or centered with wide margins.',
    'Vertical 9:16 composition balanced like a fashion editorial page.',
  ],
  framing: [
    'Centered symmetry for statements; lower-third placement for quiet captions.',
    'Wide calm margins on every side — the frame is never full.',
    'A single accent object or figure, softly lit, occupying a small share of the frame.',
  ],

  cameraBehaviour:
    'Slow and assured — a barely-perceptible cinematic zoom, a gentle drift, a settling pull-back. Motion is felt, never noticed; the luxury is in the patience.',
  motion: {
    pace: 'slow',
    cameraPresets: ['slowZoom', 'cinematicDrift', 'pullBack', 'rackFocus'],
    transitions: ['fade', 'slide'],
    effects: ['vignette'],
    transitionFrequency: 'roughly 1 in 4 scenes — soft fades between statements, clean cuts otherwise',
    effectFrequency: 'a whisper of vignette on the closing beat at most; the palette carries the mood',
  },

  colorPalette: {
    description: 'Charcoal, cream and gold — warm neutrals with a single restrained metallic note',
    tones: ['warm cream base', 'deep charcoal', 'soft graphite gray'],
    accent: 'thin brushed gold (rules, emphasis, one detail per scene)',
  },
  lighting: [
    'Soft even boutique light — gentle gradients, no harsh shadows.',
    'A warm low-key glow on charcoal panels for the dramatic beats.',
    'Gold catches a single soft highlight; it never glares.',
  ],

  typography: {
    captionStyle: 'elegant high-contrast serif, generous letter-spacing, editorial restraint',
    rules: [
      'Headlines are short and confident — 2 to 6 words, never a full sentence.',
      'Caption sparingly; whitespace is part of the message.',
      'Gold emphasis tint reserved for the single word that carries the promise.',
    ],
  },

  imagePrompt: {
    medium: 'refined minimal product photograph',
    prefix: 'elegant minimal photograph, premium editorial',
    suffix: 'soft warm light, generous negative space, refined and understated',
    vocabulary: [
      'single luxury object on a cream surface',
      'gold detail catching soft light',
      'elegant interior with wide empty space',
      'folded fabric in warm neutral tones',
      'a fine watch resting on charcoal stone',
      'still life with one flower and vast space',
      'polished marble surface in low warm light',
    ],
    rules: [
      'Describe ONE refined subject with abundant space around it — never a busy scene.',
      'Warm neutral palette with a single gold or brass note; nothing garish.',
      'Vertical composition with editorial calm and wide margins.',
      'The recurring hero object keeps identical description across scenes.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'cluttered or busy scenes',
    'harsh neon or saturated color',
    'cheap plastic or garish materials',
  ],

  consistency: {
    rules: [
      'One palette for the whole video — cream, charcoal, and the same gold, never a second accent.',
      'The gold note appears once per scene at most; more than that cheapens it.',
      'Whitespace discipline holds throughout — a single crowded frame breaks the luxury.',
    ],
    promptAnchors: ['warm cream and charcoal palette', 'refined understated luxury grade'],
  },
});
