// Style Bible — "paper-collage": the Vox Paper look as data. The visual codex
// for the 'vox' render style — paper-cutout collage, kinetic typography, taped
// archival photos on a warm gridded page. This is the DEFAULT visual style for
// the vox render style, so its rules codify — not change — the shipped look.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'paper-collage',
  displayName: 'Paper Collage',
  description: 'Vox-style paper-cutout look — kinetic typography, taped archival photos, warm gridded paper',
  status: 'active',
  renderStyle: 'vox',

  philosophy:
    'An explainer built at a craft table: ideas are cut out, taped down, and moved around by hand. The paper texture keeps heavy topics approachable, and real archival photos give the collage its soul — the style is playful, the facts are serious.',

  composition: [
    'A warm paper page with a faint grid as the constant stage — everything sits ON the paper.',
    'Cut-out elements with slight rotations and drop shadows, arranged like a hand-made collage.',
    'Real photos presented as taped-down prints, slightly askew, with handwritten-style labels.',
    'Vertical 9:16 composition read top-to-bottom like a worksheet.',
  ],
  framing: [
    'Big kinetic words dominate the frame; supporting elements stay in the margins.',
    'One idea per scene — a headline, a stat, a photo — never a crowded board.',
    'Photos fill most of the frame when they appear; the paper stays visible at the edges.',
  ],

  cameraBehaviour:
    'Playful and editorial — quick zooms punching into words, snappy pans between ideas, a paper-tear reveal when the story turns a page.',
  motion: {
    pace: 'fast',
    cameraPresets: ['fastZoom', 'newsPush', 'pushIn', 'documentaryPan'],
    transitions: ['paperReveal', 'slide', 'whip'],
    effects: ['noise'],
    transitionFrequency: 'roughly 1 in 3 scenes — paperReveal for chapter turns, slides and whips between ideas',
    effectFrequency: 'a light paper-grain noise on archival beats only; the texture is already in the design',
  },

  colorPalette: {
    description: 'Warm paper neutrals punched with editorial orange — plus near-black and brick red for drama',
    tones: ['warm gray paper', 'soft off-white', 'near-black ink'],
    accent: 'editorial orange (highlight bars, underlines, the loudest stat)',
  },
  lighting: [
    'Flat even craft-table light — the page has no light source of its own.',
    'Soft drop shadows under cut-outs sell the paper depth.',
    'Archival photos keep their original black-and-white or faded tones.',
  ],

  typography: {
    captionStyle: 'bold kinetic sans-serif, words popping in one by one, editorial confidence',
    rules: [
      'The spoken words ARE the visual — big type carries most scenes.',
      'Emphasis highlight on 1-3 key words per scene, orange bar or underline.',
      'Stats get one giant number with a short label; never paragraphs.',
    ],
  },

  imagePrompt: {
    medium: 'paper-cutout collage illustration',
    prefix: 'flat paper-cutout collage illustration',
    suffix: 'torn paper edges, subtle drop shadows, craft collage aesthetic',
    vocabulary: [
      'paper cut-out figure of a worker',
      'torn newspaper scrap on a gridded page',
      'taped-down archival photograph',
      'paper boat on a cut-out ocean',
      'scissors-cut arrow pointing upward',
      'stacked paper coins on a warm page',
      'cut-out city skyline in layered paper',
    ],
    rules: [
      'Describe ONE flat collage element or vignette as physical cut paper — layers, torn edges, tape.',
      'Keep it flat and graphic: no photorealism, no 3D rendering, no depth of field.',
      'Vertical composition sitting on the paper page.',
      'The recurring cut-out character or object keeps identical description across scenes.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'photorealistic rendering',
    'glossy 3D surfaces',
    'dark moody cinematic grading',
  ],

  consistency: {
    rules: [
      'One paper world: the same page texture, grid, and shadow depth in every scene.',
      'The orange accent is the only loud color — schemes beyond paper are reserved for the 2-4 biggest beats.',
      'Recurring cut-out characters and objects keep identical shapes and descriptions across scenes.',
    ],
    promptAnchors: ['warm paper texture background', 'flat editorial collage style'],
  },
});
