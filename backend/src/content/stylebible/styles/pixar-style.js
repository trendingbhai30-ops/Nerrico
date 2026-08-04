// Style Bible — "pixar-style": warm 3D animated storytelling — expressive
// characters, soft global illumination, family-film heart.
//
// STATUS: future — declared so the definition (and its planner wiring) is
// exercised by validation today, but not offered to users until image
// providers render consistent 3D characters reliably.

import { styleBible } from '../registry.js';

styleBible.register({
  name: 'pixar-style',
  displayName: '3D Animated',
  description: 'Warm 3D animated film look — expressive characters, soft light, family-film heart',
  status: 'future',
  renderStyle: 'cinematic',

  philosophy:
    'Explain the world the way an animated family film would: one lovable character carries the story, emotions are staged big and readable, and warmth does the persuading. Every frame should feel like a still from a film people already trust.',

  composition: [
    'One expressive character or charming object as the clear hero of the frame.',
    'Rounded friendly shapes, exaggerated proportions, readable silhouettes.',
    'Story-book staging: the environment explains the situation at a glance.',
    'Vertical 9:16 composition with the hero in the middle or lower third.',
  ],
  framing: [
    'Character close-ups for feelings; wide establishing shots for the world.',
    'Low hero angles for triumph, high gentle angles for vulnerability.',
    'Over-the-shoulder views to put the audience inside the story.',
  ],

  cameraBehaviour:
    'Animated-feature camera language — smooth confident pushes toward the hero, playful drifts through the world, a quick zoom for comedic or dramatic surprise.',
  motion: {
    pace: 'medium',
    cameraPresets: ['pushIn', 'slowZoom', 'cinematicDrift', 'fastZoom', 'pullBack'],
    transitions: ['morph', 'slide', 'fade'],
    effects: ['glow', 'snow', 'vignette'],
    transitionFrequency: 'roughly 1 in 3 shots — morphs into reveals, slides between story beats',
    effectFrequency: 'glow on magical or heartwarming beats; otherwise the render is already rich',
  },

  colorPalette: {
    description: 'Saturated storybook warmth — golden light, friendly blues and greens, candy accents',
    tones: ['golden-hour warm amber', 'friendly sky blue', 'lush storybook green'],
    accent: 'warm coral-orange (the hero color, worn or carried by the protagonist)',
  },
  lighting: [
    'Soft global illumination with warm bounce light — nothing harsh, nothing flat.',
    'Golden-hour rim light on the hero for emotional beats.',
    'Gentle atmospheric depth: soft haze, dappled light, glowing windows.',
  ],

  typography: {
    captionStyle: 'rounded friendly sans-serif, warm and legible, picture-book tone',
    rules: [
      'Captions of 0-5 words in plain warm language ("she never gave up").',
      'Caption the story beats; let pure character-emotion shots play silent.',
      'Emphasis tint on the feeling word, sparingly.',
    ],
  },

  imagePrompt: {
    medium: '3D animated film still',
    prefix: '3D animated movie still, expressive character animation',
    suffix: 'soft global illumination, warm color grading, high quality render',
    vocabulary: [
      'cute expressive character looking up with big eyes',
      'tiny hero facing a giant challenge',
      'cozy workshop interior with warm light',
      'character running through a storybook town',
      'two characters sharing a quiet moment',
      'a small robot holding a flower',
      'sunlit bedroom with toys telling a story',
    ],
    rules: [
      'Describe ONE animated-film frame: the character, their emotion (staged big and readable), the storybook setting, the warm light.',
      'Rounded appealing character design — expressive faces, readable silhouettes.',
      'Vertical composition with the hero clearly dominant.',
      'The recurring protagonist keeps identical design (species, colors, outfit) in every shot.',
    ],
  },

  forbidden: [
    'embedded text or lettering',
    'numbers or digits rendered in the image',
    'logos or brand marks',
    'watermarks',
    'user interface elements',
    'photorealistic human faces',
    'dark horror or gore imagery',
    'flat 2D vector illustration',
  ],

  consistency: {
    rules: [
      'One protagonist, one world: the hero character keeps identical design in every appearance.',
      'The warm storybook grade holds for the whole video — night scenes stay cozy, never grim.',
      'Supporting characters and places recur with fixed designs; the film has a cast, not extras.',
    ],
    promptAnchors: ['warm storybook color palette', 'soft animated film lighting'],
  },
});
