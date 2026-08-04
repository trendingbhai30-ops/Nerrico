// Style Bible — "history": sepia archival storytelling — period-faithful
// frames that feel pulled from an old box of photographs and paintings.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'history',
  displayName: 'History Archive',
  description: 'Period archival look — sepia photographs, painterly reconstructions, museum stillness',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'The past is shown in its own materials: daguerreotypes, sepia prints, oil paintings, engineering drawings of the era. Time itself is the protagonist — every frame should feel recovered, not generated.',

  composition: [
    'Formal period composition — centered portraits, balanced streetscapes, staged group scenes of the era.',
    'Era-accurate props, clothing, and architecture in every frame.',
    'Texture of the medium is part of the image: paper fibre, plate scratches, canvas weave.',
    'Vertical 9:16 framing of what were often landscape originals — favor tight period detail crops.',
  ],
  framing: [
    'Formal portrait framing for historical figures — chest-up, direct, era-appropriate.',
    'Wide period streetscapes and battlefields for context beats.',
    'Close-ups of era artifacts: seals, maps, coins, machinery.',
  ],

  cameraBehaviour:
    'Museum patience — slow Ken Burns pushes across stills, lateral drifts along wide scenes, a respectful pull-back to end an era. The camera never moves faster than memory.',
  motion: {
    pace: 'slow',
    cameraPresets: ['slowZoom', 'documentaryPan', 'pullBack', 'slowRoll'],
    transitions: ['paperReveal', 'fade'],
    effects: ['filmGrain', 'noise', 'dust', 'vignette'],
    transitionFrequency: 'paperReveal for era changes, fade elsewhere — roughly 1 in 3 shots',
    effectFrequency: 'grain or dust on most shots is welcome — age is the aesthetic',
  },

  colorPalette: {
    description: 'Aged archival tones — sepia and silver monochrome, faded pigment color for paintings',
    tones: ['warm sepia browns', 'silver-gelatin grays', 'faded oil-paint ochres and blues'],
    accent: 'deep archival red (wax-seal red, used once per era)',
  },
  lighting: [
    'Flat honest daylight of early photography — long exposures, no theatrics.',
    'North-window painter light for portrait reconstructions.',
    'Candle and gaslight warmth for interior period scenes.',
  ],

  typography: {
    captionStyle: 'engraved serif with archival restraint — museum placard voice',
    rules: [
      'Captions anchor time and place: dates, city names, treaty names — 0-6 words.',
      'Caption most shots; history needs its labels.',
      'Emphasis tint reserved for the year or the name that changes everything.',
    ],
  },

  imagePrompt: {
    medium: 'archival period photograph or period oil painting',
    prefix: 'archival historical image',
    suffix: 'aged paper texture, period-accurate detail',
    vocabulary: [
      'sepia portrait of a historical figure',
      'silver-gelatin photograph of a city street',
      'oil painting of a pivotal gathering',
      'era-accurate machinery close-up',
      'hand-drawn map with worn creases',
      'daguerreotype of workers at a site',
      'faded photograph of a harbor with tall ships',
    ],
    rules: [
      'Describe ONE period-faithful image and NAME ITS MEDIUM: sepia photograph, silver-gelatin print, oil painting, or engineering drawing of the era.',
      'Everything visible must belong to the era — clothing, vehicles, architecture, tools.',
      'Vertical composition or a tight vertical crop of a period scene.',
      'The era sets the medium: pre-1840 beats are paintings/engravings, later beats are photographs.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'modern objects in period scenes',
    'clean digital rendering without age texture',
    'split screens or multi-panel collages',
  ],

  consistency: {
    rules: [
      'One era, one medium mix: the video establishes its period materials early and never breaks them.',
      'Historical figures keep identical period description (clothing, age, bearing) across shots.',
      'Age artifacts (grain, fading, scratches) appear on every frame — pristine frames break the archive.',
    ],
    promptAnchors: ['aged archival tone', 'historical period texture'],
  },
});
