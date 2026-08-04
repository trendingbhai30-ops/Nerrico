// Style Bible — "modern-tech": clean futurism — product-launch minimalism,
// engineered surfaces, cool light with an electric edge.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'modern-tech',
  displayName: 'Modern Tech',
  description: 'Clean futurist look — engineered surfaces, studio precision, electric cool light',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'The future as a product launch: perfect surfaces, engineered light, nothing accidental. Complexity is expressed through precision, not clutter — one flawless object or space explains more than a diagram ever could.',

  composition: [
    'Engineered minimalism — one product, device, or space rendered flawlessly on a controlled backdrop.',
    'Macro detail of materials: brushed aluminium, matte glass, silicon, carbon fibre.',
    'Human presence as scale and touch — a hand on a surface, a silhouette in a server aisle.',
    'Vertical 9:16 composition with strict geometric alignment.',
  ],
  framing: [
    'Dead-center product framing for reveals; rule-of-thirds for human-technology moments.',
    'Extreme macro close-ups for how-it-works beats.',
    'Symmetric one-point-perspective corridors (labs, data centers) for scale beats.',
  ],

  cameraBehaviour:
    'Engineered like a product film — perfect dolly pushes, floating orbital drift around objects, a fast precise punch-in for the reveal, focus racking along machined edges.',
  motion: {
    pace: 'medium',
    cameraPresets: ['pushIn', 'cinematicDrift', 'fastZoom', 'rackFocus'],
    transitions: ['whip', 'slide', 'morph'],
    effects: ['glow', 'blur', 'vignette'],
    transitionFrequency: 'roughly 1 in 3 shots — whips between ideas, morphs into reveals',
    effectFrequency: 'glow on energy/breakthrough beats, a soft blur entrance on dream beats; otherwise clinical clean',
  },

  colorPalette: {
    description: 'Studio neutral with an electric edge — graphite, silver, deep space blue, one neon signal',
    tones: ['graphite and gunmetal darks', 'silver studio neutrals', 'deep space blue'],
    accent: 'electric cyan-blue signal light',
  },
  lighting: [
    'Controlled studio gradients — softbox falloff across perfect surfaces.',
    'Emissive edge light from the technology itself: status LEDs, screens off-frame, light strips.',
    'Deep black negative space around the lit subject.',
  ],

  typography: {
    captionStyle: 'precise modern serif, launch-keynote restraint',
    rules: [
      'Captions are spec-sheet punches of 0-5 words ("10x faster", "one chip").',
      'Caption the claim beats; let pure product beauty shots stand alone.',
      'Emphasis tint on the multiplier or the breakthrough word.',
    ],
  },

  imagePrompt: {
    medium: 'photorealistic product-film still',
    prefix: 'futuristic product photography, photorealistic',
    suffix: 'studio lighting, engineered minimalism, high detail',
    vocabulary: [
      'macro shot of a silicon chip',
      'server corridor in one-point perspective',
      'robotic arm in a clean lab',
      'hand touching a glowing glass surface',
      'sleek device floating on a dark backdrop',
      'engineer silhouette before a wall of light',
      'fibre optic strands glowing in darkness',
    ],
    rules: [
      'Describe ONE engineered image: the object or space, its material finish, the controlled light, the single accent light source.',
      'Surfaces are flawless; environments are dust-free and intentional.',
      'Vertical composition with strict geometry.',
      'The recurring device or facility keeps identical description across shots.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'cluttered desk scenes',
    'retro or grunge texture',
    'split screens or multi-panel collages',
  ],

  consistency: {
    rules: [
      'One product world: the same device, lab, and materials recur with identical description.',
      'The accent light stays the same color for the whole video — it is the brand of the story.',
      'Every surface stays flawless; a single grungy frame breaks the engineered world.',
    ],
    promptAnchors: ['clean studio grade', 'electric blue accent lighting'],
  },
});
