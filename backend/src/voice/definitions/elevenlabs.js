// Nerrico Voice Engine — ElevenLabs voice definitions (Phase 5A).
//
// These are the ONLY voices verified to work on the restricted ElevenLabs
// free-tier key. Each is registered as a structured, validated, frozen
// VoiceRecord in the voice registry at module load time.
//
// Adding a new ElevenLabs voice = one more voiceRegistry.register({…}) block.
// Do NOT hardcode voiceIds anywhere else — always resolve via the registry.

import { voiceRegistry } from '../registry.js';

// ---------------------------------------------------------------------------
// George — British male narrator (the default English voice)
// ---------------------------------------------------------------------------
voiceRegistry.register({
  id: 'voice.george',
  displayName: 'George',
  provider: 'elevenlabs',
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  gender: 'male',
  accent: 'british',
  languages: ['english'],
  tags: ['narrator', 'documentary', 'authoritative', 'calm', 'deep', 'news'],
  tier: 'free-premade',
  supportsWordTimestamps: true,
  supportsMultilingual: false,
  supportsEmotion: false,
  defaultSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
  },
  modelCompatibility: ['eleven_monolingual_v1', 'eleven_multilingual_v2'],
  status: 'active',
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
  metadata: {
    freeTierAvailable: true,
    requiresPaidPlan: false,
    sampleFile: null,
    freeNote: null,
    elevenLabsModel: 'eleven_monolingual_v1',
    bestFor: ['cinematic', 'documentary', 'history', 'paper-collage'],
  },
});

// ---------------------------------------------------------------------------
// Sarah — American female voice (default for real-estate / professional)
// ---------------------------------------------------------------------------
voiceRegistry.register({
  id: 'voice.sarah',
  displayName: 'Sarah',
  provider: 'elevenlabs',
  voiceId: 'EXAVITQu4vr4xnSDxMaL',
  gender: 'female',
  accent: 'us',
  languages: ['english'],
  tags: ['professional', 'clear', 'warm', 'realestate', 'finance', 'corporate'],
  tier: 'free-premade',
  supportsWordTimestamps: true,
  supportsMultilingual: false,
  supportsEmotion: false,
  defaultSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
  },
  modelCompatibility: ['eleven_monolingual_v1', 'eleven_multilingual_v2'],
  status: 'active',
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
  metadata: {
    freeTierAvailable: true,
    requiresPaidPlan: false,
    sampleFile: null,
    freeNote: null,
    elevenLabsModel: 'eleven_monolingual_v1',
    bestFor: ['luxury', 'finance', 'modern-tech', 'minimal'],
  },
});

// ---------------------------------------------------------------------------
// Adam — American male (energetic; default for Hinglish multilingual)
// ---------------------------------------------------------------------------
voiceRegistry.register({
  id: 'voice.adam',
  displayName: 'Adam',
  provider: 'elevenlabs',
  voiceId: 'pNInz6obpgDQGcFmaJgB',
  gender: 'male',
  accent: 'us',
  languages: ['english', 'hinglish', 'multilingual'],
  tags: ['energetic', 'tech', 'story', 'multilingual', 'dynamic', 'conversational'],
  tier: 'free-premade',
  supportsWordTimestamps: true,
  supportsMultilingual: true,
  supportsEmotion: false,
  defaultSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
  },
  // Adam uses eleven_multilingual_v2 for Hinglish/Hindi content.
  modelCompatibility: ['eleven_monolingual_v1', 'eleven_multilingual_v2'],
  status: 'active',
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
  metadata: {
    freeTierAvailable: true,
    requiresPaidPlan: false,
    sampleFile: null,
    freeNote: null,
    elevenLabsModel: 'eleven_multilingual_v2',
    bestFor: ['ai-documentary', 'modern-tech', 'hinglish'],
  },
});

// ---------------------------------------------------------------------------
// Viraj — Hindi male narrator (LIBRARY voice — blocked on free tier)
// ---------------------------------------------------------------------------
voiceRegistry.register({
  id: 'voice.viraj',
  displayName: 'Viraj',
  provider: 'elevenlabs',
  voiceId: 'pHG3exaXQt8bmTWbaVOs',
  gender: 'male',
  accent: 'hindi',
  languages: ['hindi', 'hinglish'],
  tags: ['hindi', 'narrator', 'documentary', 'calm', 'storytelling'],
  tier: 'library',
  supportsWordTimestamps: true,
  supportsMultilingual: true,
  supportsEmotion: false,
  defaultSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
  },
  modelCompatibility: ['eleven_multilingual_v2'],
  status: 'active',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
  metadata: {
    freeTierAvailable: false,
    requiresPaidPlan: true,
    sampleFile: null,
    freeNote: 'Library voice — returns 402 on the free-tier restricted key. Free-tier Hinglish falls back to voice.adam via eleven_multilingual_v2.',
    elevenLabsModel: 'eleven_multilingual_v2',
    bestFor: ['hindi', 'hinglish'],
  },
});
