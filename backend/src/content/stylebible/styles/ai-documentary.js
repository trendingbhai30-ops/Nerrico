// Style Bible — "ai-documentary": the stylized extreme of the reference
// "Moon-channel" look — surreal symbolism, glowing accents, painterly-photoreal
// hybrid frames that no camera could capture.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'ai-documentary',
  displayName: 'AI Documentary',
  description: 'Stylized surreal documentary — symbolic hyperreal imagery, glowing accents, mythic drama',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'Reality, but mythologized. Every beat becomes an icon — a CEO is a colossus, a bankruptcy is a sinking ship, an idea is a burning bulb. The imagery is deliberately impossible; the emotional truth is exact.',

  composition: [
    'One monumental symbol per frame — oversized, centered, unmistakable.',
    'Hyperreal detail on the subject, simplified painterly surroundings.',
    'Scale contrast as a storytelling tool: tiny figures before enormous forces.',
    'Vertical 9:16 composition built around a dominant central axis.',
  ],
  framing: [
    'Heroic low angles and god-view top shots — the extremes eye-level avoids.',
    'Extreme close-ups of eyes and faces at emotional turns.',
    'Vast symmetrical wides for empires, ruins, and aftermath.',
  ],

  cameraBehaviour:
    'Bold and declarative — hard pushes into symbols, punch-ins on reveals, a slow ominous roll when tension builds, impact shakes on catastrophic beats.',
  motion: {
    pace: 'medium',
    cameraPresets: ['pushIn', 'fastZoom', 'slowZoom', 'slowRoll', 'impactShake'],
    transitions: ['flash', 'whip', 'morph', 'heroReveal'],
    effects: ['glow', 'embers', 'vignette', 'filmGrain'],
    transitionFrequency: 'roughly 1 in 2 shots — this style cuts loud',
    effectFrequency: 'freely on climactic beats (embers over destruction, glow over triumph); calm beats stay clean',
  },

  colorPalette: {
    description: 'Operatic dark palette — near-black stage, one saturated symbolic color per beat',
    tones: ['abyssal blacks', 'burnished gold light', 'blood red for threat', 'electric cyan for ideas'],
    accent: 'incandescent orange-red glow',
  },
  lighting: [
    'Theatrical single-source drama — sunburst behind the subject, underlight for menace.',
    'Emissive light from within: glowing eyes, screens, cracks, embers.',
    'Heavy atmosphere — smoke, sparks, and dust made visible by light.',
  ],

  typography: {
    captionStyle: 'imposing serif, large and sparse, carved-in-stone weight',
    rules: [
      'Captions are declarations of 0-5 words ("The empire falls").',
      'Caption the mythic beats; let pure-symbol shots breathe unlabeled.',
      'Emphasis tint on the single word of doom or glory.',
    ],
  },

  imagePrompt: {
    medium: 'hyperreal stylized digital painting, cinematic concept art',
    prefix: 'epic cinematic concept art, hyperreal stylized',
    suffix: 'dramatic rim lighting, volumetric atmosphere, ultra detailed',
    vocabulary: [
      'colossal figure towering over a tiny crowd',
      'businessman with faintly glowing eyes in darkness',
      'paper ship sinking in a black ocean',
      'golden throne in a ruined hall',
      'red sunburst behind a silhouetted figure',
      'cracked marble statue of a titan',
      'a single burning lightbulb in the void',
    ],
    rules: [
      'Describe ONE symbolic hyperreal image: the central symbol, its impossible scale or property, the single dominant color, the light source.',
      'Impossible is good — myth beats realism here; keep the symbol instantly readable.',
      'Vertical composition with a dominant central subject.',
      'The recurring protagonist keeps identical wording and wardrobe in every appearance.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'flat corporate illustration style',
    'photorealistic mundane snapshots',
    'split screens or multi-panel collages',
  ],

  consistency: {
    rules: [
      'One myth, one visual language: the protagonist, the empire, and the threat each keep a fixed symbolic form across all shots.',
      'One saturated symbolic color per beat, always against the same near-black stage.',
      'Every impossible element must recur if shown twice — the myth has rules.',
    ],
    promptAnchors: ['near-black dramatic backdrop', 'single saturated accent color'],
  },
});
