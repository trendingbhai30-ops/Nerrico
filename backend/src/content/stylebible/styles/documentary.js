// Style Bible — "documentary": grounded photojournalism. Where 'cinematic'
// dramatizes, this style testifies — natural light, real places, the feel of
// a press photo or an archival frame.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'documentary',
  displayName: 'Documentary Realism',
  description: 'Photojournalistic look — natural light, real places, archival honesty',
  status: 'active',
  renderStyle: 'cinematic',

  philosophy:
    'The camera is a witness, not a director. Every image should feel captured, not staged — the truth of a moment beats the beauty of a composition. Restraint builds trust; trust keeps viewers watching.',

  composition: [
    'Real environments with honest detail — clutter is allowed when it tells the truth of a place.',
    'Subjects mid-action or mid-thought, never posing for the camera.',
    'Wide establishing context before tight human detail.',
    'Vertical 9:16 composition with documentary honesty — imperfect balance is acceptable.',
  ],
  framing: [
    'Eye-level reportage framing as the default; angles only when the location forces them.',
    'Medium shots of people in their environment; the place explains the person.',
    'Detail shots of worn objects, signage-free storefronts, tools, hands at work.',
  ],

  cameraBehaviour:
    'Steady observational drift — long slow pans across scenes, gentle push-ins when a subject earns attention, a settling pull-back to leave a place. Nothing flashy; the story provides the motion.',
  motion: {
    pace: 'slow',
    cameraPresets: ['documentaryPan', 'slowZoom', 'pullBack', 'rackFocus'],
    transitions: ['fade', 'slide'],
    effects: ['filmGrain', 'noise', 'dust'],
    transitionFrequency: 'sparingly — roughly 1 in 4 shots; hard cuts feel more truthful',
    effectFrequency: 'grain on archival/flashback beats, noise only for period footage feel',
  },

  colorPalette: {
    description: 'Natural unforced color — daylight neutrals with mild desaturation, true blacks',
    tones: ['neutral daylight tones', 'muted earth browns and grays', 'soft overcast whites'],
    accent: 'documentary red (used only for the single fact that must land)',
  },
  lighting: [
    'Available light only — daylight through windows, overcast skies, street light at night.',
    'No stylized rim lights or theatrical beams; shadows fall where they naturally would.',
    'Golden hour allowed when the story happens outdoors, never as decoration.',
  ],

  typography: {
    captionStyle: 'quiet serif captions, lower-third placement, newsprint restraint',
    rules: [
      'Captions state facts — dates, places, quantities — in 0-6 words.',
      'Caption roughly half the shots; testimony images need no label.',
      'Emphasis tint only for the pivotal fact word.',
    ],
  },

  imagePrompt: {
    medium: 'documentary photograph',
    prefix: 'documentary photograph, photojournalism',
    suffix: 'natural light, realistic detail, 35mm reportage photograph',
    vocabulary: [
      'worker mid-task in real workplace',
      'weathered storefront exterior',
      'crowded street scene candid moment',
      'aging industrial interior',
      'portrait of a person in their environment',
      'close-up of worn hands or tools',
      'archival black and white street scene',
    ],
    rules: [
      'Describe ONE candid documentary photograph: subject, real-world setting, what the subject is doing, natural light conditions.',
      'It must feel captured, not staged — avoid theatrical drama or fantasy elements.',
      'Vertical composition suited to a 9:16 frame.',
      'Period beats may be described as archival black-and-white photographs.',
      'Recurring people and places keep identical descriptions across shots.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'staged theatrical lighting',
    'fantasy or surreal elements',
    'split screens or multi-panel collages',
  ],

  consistency: {
    rules: [
      'One documentary world: the same protagonist and locations reappear with identical descriptions.',
      'Color era is fixed per video — modern natural color OR archival monochrome for flashbacks, never a third grade.',
      'Every image obeys available-light realism; one stylized frame breaks the testimony.',
    ],
    promptAnchors: ['natural available light', 'muted realistic color grade'],
  },
});
