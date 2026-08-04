// Style Bible — "anime": cinematic 2D anime — painted skies, dramatic speed
// lines of emotion, the Makoto-Shinkai-adjacent light that made anime stills a
// visual language of their own.
//
// STATUS: future — declared so the definition (and its planner wiring) is
// exercised by validation today, but not offered to users until image
// providers hold a consistent anime character model across shots.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'anime',
  displayName: 'Cinematic Anime',
  description: 'Cinematic 2D anime look — painted skies, luminous light, emotional wide shots',
  status: 'future',
  renderStyle: 'cinematic',

  philosophy:
    'Feelings rendered as weather and light. Anime tells inner stories with outer skies — a decision is a sunset, loneliness is an empty crossing, hope is light breaking through clouds. The frame is painted, deliberate, and unashamedly emotional.',

  composition: [
    'Painted-background richness: detailed skies, cities, and interiors with animation-cel characters.',
    'The sky as an actor — clouds, stars, and light shafts carry the emotional register.',
    'Small figures against vast painted environments for longing and scale.',
    'Vertical 9:16 composition with dramatic sky headroom.',
  ],
  framing: [
    'Wide painted establishing shots for mood; cel close-ups for emotional turns.',
    'Characters framed against light sources — sunsets, windows, train doors.',
    'Extreme detail cuts: a hand, an eye reflecting light, rain on glass.',
  ],

  cameraBehaviour:
    'Anime cinematography — long held wides with a slow drift, a decisive push toward the character at the turn, one dramatic whip or flash on the emotional peak.',
  motion: {
    pace: 'medium',
    cameraPresets: ['slowZoom', 'cinematicDrift', 'pushIn', 'documentaryPan', 'fastZoom'],
    transitions: ['fade', 'whip', 'flash'],
    effects: ['glow', 'snow', 'particles'],
    transitionFrequency: 'roughly 1 in 3 shots — fades for time passing, a whip or flash on the peak',
    effectFrequency: 'glow on luminous beats, drifting particles for petals/snow/rain moments; plain shots stay clean',
  },

  colorPalette: {
    description: 'Luminous anime palette — saturated twilight blues and pinks, deep painted shadows',
    tones: ['twilight blue and violet', 'sunset pink and amber', 'deep painted shadow tones'],
    accent: 'brilliant sky cyan (the color of hope and open sky)',
  },
  lighting: [
    'Luminous painted light — god rays, lens-flare sparkle, glowing horizons.',
    'Backlit characters with bright rim light against saturated skies.',
    'Interior scenes lit by windows; night scenes lit by signs and stars.',
  ],

  typography: {
    captionStyle: 'clean light sans-serif with wide tracking, subtitle understatement',
    rules: [
      'Captions read like subtitles — 0-6 quiet words under the image.',
      'Caption sparsely; the painted frames carry the emotion.',
      'Emphasis tint on the single word the beat turns on.',
    ],
  },

  imagePrompt: {
    medium: 'cinematic anime film still',
    prefix: 'cinematic anime illustration, detailed painted background',
    suffix: 'luminous lighting, saturated twilight colors, high detail 2D animation still',
    vocabulary: [
      'schoolgirl silhouetted against a burning sunset sky',
      'empty city crossing under painted clouds',
      'train window with light streaming through',
      'character close-up with light reflecting in the eyes',
      'vast starry sky over tiny rooftops',
      'rain-slicked street glowing with neon signs',
      'cherry blossom petals drifting across the frame',
    ],
    rules: [
      'Describe ONE anime frame: the character or place, the sky/light condition, the emotional weather of the moment.',
      'Painted-background detail with clean cel-style characters — 2D animation, never 3D render.',
      'Vertical composition with generous dramatic sky.',
      'The recurring character keeps identical design (hair, uniform, colors) in every shot.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'photorealistic rendering',
    '3D CGI rendering',
    'western cartoon style',
  ],

  consistency: {
    rules: [
      'One character model: the protagonist keeps identical hair, outfit, and design in every shot.',
      'One time-of-day arc per video — light moves forward (day into dusk), never randomly.',
      'The painted-background density stays constant; a flat frame breaks the film.',
    ],
    promptAnchors: ['luminous anime color grading', 'painterly detailed backgrounds'],
  },
});
