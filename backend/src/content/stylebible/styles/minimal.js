// Style Bible — "minimal": radical reduction — one subject, vast negative
// space, gallery stillness. The quietest style in the bible.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'minimal',
  displayName: 'Minimal Gallery',
  description: 'Radical reduction — single subjects in vast negative space, soft studio stillness',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'Remove until only meaning remains. One subject, one thought, one frame — the emptiness around the subject IS the composition. Silence between images gives each one weight.',

  composition: [
    'ONE small subject in a vast empty field — negative space takes 70% or more of the frame.',
    'Solid seamless backdrops; no environments, no context, no props beyond the subject.',
    'Off-center placement against emptiness for tension; dead center for finality.',
    'Vertical 9:16 composition where empty space does the storytelling.',
  ],
  framing: [
    'Tiny subject in a huge frame for insignificance beats; frame-filling macro for essence beats.',
    'Objects photographed like museum pieces — floating, shadowed, alone.',
    'No angles, no drama — flat frontal or perfect profile views.',
  ],

  cameraBehaviour:
    'Barely-there motion — a glacial push toward the subject, an almost imperceptible drift, a slow retreat that lets emptiness win. Stillness is the default state.',
  motion: {
    pace: 'slow',
    cameraPresets: ['slowZoom', 'cinematicDrift', 'pullBack'],
    transitions: ['fade', 'slide'],
    effects: ['vignette', 'blur'],
    transitionFrequency: 'roughly 1 in 4 shots — mostly clean cuts between stillness',
    effectFrequency: 'almost never — a whisper of vignette on the final beat at most',
  },

  colorPalette: {
    description: 'Two-tone restraint — warm paper whites and soft charcoal, nothing else',
    tones: ['warm gallery white', 'soft pale gray', 'muted charcoal'],
    accent: 'single warm terracotta note (one object, once or twice per video)',
  },
  lighting: [
    'Soft directionless studio light — shadows barely suggested.',
    'One gentle gradient across the backdrop for depth.',
    'No hard light, no drama, no visible sources.',
  ],

  typography: {
    captionStyle: 'featherweight serif, generous letter-spacing, whisper volume',
    rules: [
      'Captions of 0-4 words, placed in the emptiness, never on the subject.',
      'Caption sparingly — roughly 1 in 2 shots; emptiness needs no label.',
      'Emphasis tint at most once per video.',
    ],
  },

  imagePrompt: {
    medium: 'minimalist studio photograph',
    prefix: 'minimalist photograph, single subject',
    suffix: 'vast negative space, soft even studio light, seamless backdrop',
    vocabulary: [
      'single chair in an empty white room',
      'one apple on a pale surface',
      'lone figure tiny in a vast void',
      'a key floating on seamless white',
      'single crumpled paper ball on gray',
      'one door standing alone',
      'a single coin casting a soft shadow',
    ],
    rules: [
      'Describe ONE subject and NOTHING else: the object or figure, its exact position in the empty frame, the backdrop tone.',
      'No environments, no clutter, no secondary elements — if it needs two objects, it needs two shots.',
      'Vertical composition dominated by negative space.',
      'The recurring subject keeps identical description across shots.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'busy backgrounds or environments',
    'multiple competing subjects',
    'dramatic theatrical lighting',
  ],

  consistency: {
    rules: [
      'One backdrop tone family for the entire video — the gallery never changes walls.',
      'The subject scale rhythm (tiny/huge) alternates deliberately, never randomly.',
      'The terracotta accent object appears at most twice, and it must be the same object.',
    ],
    promptAnchors: ['soft neutral studio tones', 'clean minimalist emptiness'],
  },
});
