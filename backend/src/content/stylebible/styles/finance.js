// Style Bible — "finance": cold institutional money — glass towers, steel,
// marble, the physical iconography of capital without a single chart.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'finance',
  displayName: 'Finance Noir',
  description: 'Institutional money look — glass towers, cold light, the physical symbols of capital',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'Money is shown as physics, not data: towers, vaults, hands signing, elevators rising. Numbers live in the captions — the images show power, risk, and consequence in cold institutional light.',

  composition: [
    'Hard geometry — glass grids, marble columns, elevator shafts, boardroom tables as leading lines.',
    'Physical symbols of capital: bank vaults, contracts, cufflinks, skyline views from corner offices.',
    'People shown as operators of the machine — framed by architecture, rarely filling the frame.',
    'Vertical 9:16 composition that emphasizes height: towers, atriums, stairwells.',
  ],
  framing: [
    'Low angles up glass facades for power; top-down views of lobbies for systems.',
    'Tight close-ups on transactional gestures — handshakes, signatures, keys turning.',
    'Long-lens compression of skylines and trading floors for scale beats.',
  ],

  cameraBehaviour:
    'Precise and urgent — decisive news-style pushes onto subjects, clean dolly moves through architecture, a rack focus when the fine print becomes the story.',
  motion: {
    pace: 'medium',
    cameraPresets: ['newsPush', 'pushIn', 'slowZoom', 'rackFocus'],
    transitions: ['slide', 'whip', 'fade'],
    effects: ['vignette', 'filmGrain'],
    transitionFrequency: 'roughly 1 in 3 shots — whips for reversals, slides for sequences',
    effectFrequency: 'a quiet vignette on tension beats only; this style stays clean',
  },

  colorPalette: {
    description: 'Cold institutional grade — steel blues and slate, marble neutrals, one gold note for money itself',
    tones: ['steel blue glass tones', 'cold slate grays', 'marble off-whites'],
    accent: 'muted gold (money itself, used sparingly)',
  },
  lighting: [
    'Cool fluorescent evenness of institutions — flat, shadowless, procedural.',
    'Late-night office glow: monitor-lit faces in dark towers.',
    'Hard morning light cutting across boardrooms for reckoning beats.',
  ],

  typography: {
    captionStyle: 'austere serif with ledger precision',
    rules: [
      'Captions carry the numbers the images refuse to show — figures, dates, percentages in 0-6 words.',
      'Caption roughly 2 of every 3 shots; architecture beats can stand alone.',
      'Emphasis tint on the figure or the verb of consequence ("lost", "owed").',
    ],
  },

  imagePrompt: {
    medium: 'photorealistic cinematic still',
    prefix: 'cinematic corporate photograph, photorealistic',
    suffix: 'cold institutional lighting, glass and steel architecture',
    vocabulary: [
      'glass skyscraper facade from below',
      'empty boardroom with a long table',
      'hand signing a document close-up',
      'bank vault door in cold light',
      'businessman at a window over the skyline at night',
      'marble lobby with tiny figures',
      'stack of banded currency on a desk',
    ],
    rules: [
      'Describe ONE institutional image: the physical symbol of capital, its architectural setting, the cold light condition.',
      'No charts, graphs, screens, or data visualizations — consequence is shown physically.',
      'Vertical composition emphasizing height or depth.',
      'The recurring institution (its tower, its lobby, its boardroom) keeps identical description across shots.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'charts or graphs inside the image',
    'cartoon money imagery like flying banknotes',
    'split screens or multi-panel collages',
  ],

  consistency: {
    rules: [
      'One institution, one skyline: the recurring tower and interiors keep identical descriptions.',
      'The cold grade never warms — gold appears only on the money itself.',
      'People stay anonymous operators unless the story names a protagonist; then that figure recurs identically.',
    ],
    promptAnchors: ['cold blue institutional grade', 'clean corporate minimalism'],
  },
});
