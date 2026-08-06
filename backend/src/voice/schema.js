// Nerrico Voice Engine — schema (Phase 5A).
//
// The single definition of WHAT a voice is (the record shape every consumer
// sees), WHICH providers exist, and WHICH tiers voices can belong to.
// Adding a future provider (OpenAI, Azure, Google, PlayHT, Cartesia, Kokoro,
// local TTS) is one entry in VOICE_PROVIDERS — registry, intelligence,
// resolver, and search all read this table and need no changes.

/**
 * @typedef {object} VoiceRecord
 * @property {string} id                      Semantic id, e.g. "voice.george".
 * @property {string} displayName             Human-readable name.
 * @property {string} provider                Key of VOICE_PROVIDERS, e.g. "elevenlabs".
 * @property {string} voiceId                 Provider-native voice identifier.
 * @property {'male'|'female'|'neutral'|null} gender
 * @property {string} accent                  e.g. "british", "us", "hindi".
 * @property {string[]} languages             Language codes this voice handles well.
 * @property {string[]} tags                  Semantic tags (narrator, calm, energetic …).
 * @property {string} tier                    Key of VOICE_TIERS.
 * @property {boolean} supportsWordTimestamps
 * @property {boolean} supportsMultilingual   Requires a multilingual TTS model.
 * @property {boolean} supportsEmotion        Expressive/style control available.
 * @property {object}  defaultSettings        Provider-default generation params.
 * @property {string[]} modelCompatibility    Compatible model ids (provider-specific).
 * @property {'active'|'inactive'|'future'} status
 * @property {string} createdAt               ISO timestamp.
 * @property {string} updatedAt               ISO timestamp.
 * @property {object} metadata                Provider-specific extras.
 */

// ---------------------------------------------------------------------------
// Provider table — the ONLY place a voice provider is defined.
// ---------------------------------------------------------------------------
// Future providers add one entry here. No other Voice Engine files change.

export const VOICE_PROVIDERS = Object.freeze({
  elevenlabs: {
    name: 'ElevenLabs',
    description: 'AI voice synthesis with word-level timestamps',
    supportsTimestamps: true,
    supportsEmotion: true,
    website: 'https://elevenlabs.io',
    tiers: ['free-premade', 'library', 'cloned', 'premium'],
  },
  // Future providers (declared for BYOK readiness, not yet active):
  openai: {
    name: 'OpenAI TTS',
    description: 'OpenAI text-to-speech voices',
    supportsTimestamps: false,
    supportsEmotion: false,
    website: 'https://openai.com',
    tiers: ['premium'],
  },
  azure: {
    name: 'Azure Cognitive Services',
    description: 'Microsoft Neural TTS with SSML support',
    supportsTimestamps: true,
    supportsEmotion: true,
    website: 'https://azure.microsoft.com/en-us/products/ai-services/text-to-speech',
    tiers: ['premium'],
  },
  google: {
    name: 'Google Cloud TTS',
    description: 'Google WaveNet and Neural2 voices',
    supportsTimestamps: false,
    supportsEmotion: false,
    website: 'https://cloud.google.com/text-to-speech',
    tiers: ['premium'],
  },
  playht: {
    name: 'PlayHT',
    description: 'Ultra-realistic generative voice platform',
    supportsTimestamps: true,
    supportsEmotion: true,
    website: 'https://play.ht',
    tiers: ['premium', 'cloned'],
  },
  cartesia: {
    name: 'Cartesia',
    description: 'Low-latency streaming voice synthesis',
    supportsTimestamps: false,
    supportsEmotion: true,
    website: 'https://cartesia.ai',
    tiers: ['premium', 'cloned'],
  },
  kokoro: {
    name: 'Kokoro',
    description: 'Open-weight local TTS model',
    supportsTimestamps: false,
    supportsEmotion: false,
    website: 'https://huggingface.co/hexgrad/Kokoro-82M',
    tiers: ['local'],
  },
  local: {
    name: 'Local TTS',
    description: 'Generic local text-to-speech engines',
    supportsTimestamps: false,
    supportsEmotion: false,
    website: null,
    tiers: ['local'],
  },
});

// ---------------------------------------------------------------------------
// Tier table — every capability class a voice can belong to.
// ---------------------------------------------------------------------------

export const VOICE_TIERS = Object.freeze({
  'free-premade': {
    label: 'Free Premade',
    description: 'Built-in voices available on any free-tier API key',
    requiresKey: true,
    requiresPaidPlan: false,
  },
  library: {
    label: 'Library',
    description: 'Shared voice library; requires a paid plan on ElevenLabs',
    requiresKey: true,
    requiresPaidPlan: true,
  },
  cloned: {
    label: 'Cloned',
    description: 'Professional Voice Clone; requires a paid plan',
    requiresKey: true,
    requiresPaidPlan: true,
  },
  premium: {
    label: 'Premium',
    description: 'Paid-only provider or model tier',
    requiresKey: true,
    requiresPaidPlan: true,
  },
  local: {
    label: 'Local',
    description: 'Runs locally — no API key required',
    requiresKey: false,
    requiresPaidPlan: false,
  },
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const isStr      = (v) => typeof v === 'string';
const isStrArray = (v) => Array.isArray(v) && v.every(isStr);
const isBool     = (v) => typeof v === 'boolean';

/**
 * Validate a VoiceRecord. Throws with a precise message on the first
 * violation — mirrors validateStyleDefinition and validateAssetRecord.
 * @param {VoiceRecord} v
 * @returns {VoiceRecord} the same record (for chaining)
 */
export function validateVoiceRecord(v) {
  const fail = (msg) => {
    throw new Error(`Voice Engine: invalid voice${v && v.id ? ` "${v.id}"` : ''} — ${msg}`);
  };

  if (!v || typeof v !== 'object') fail('record is not an object');
  if (!isStr(v.id) || !/^voice\.[a-z][a-z0-9-]*$/.test(v.id)) {
    fail('id must match "voice.<slug>" (lowercase, hyphens allowed, e.g. "voice.george")');
  }
  if (!isStr(v.displayName) || !v.displayName) fail('displayName is required');
  if (!VOICE_PROVIDERS[v.provider]) {
    fail(`unknown provider "${v.provider}" — add it to VOICE_PROVIDERS first`);
  }
  if (!isStr(v.voiceId) || !v.voiceId) fail('voiceId (provider-native id) is required');
  if (v.gender !== null && !['male', 'female', 'neutral'].includes(v.gender)) {
    fail('gender must be "male", "female", "neutral", or null');
  }
  if (!isStr(v.accent) || !v.accent) fail('accent is required');
  if (!isStrArray(v.languages) || !v.languages.length) {
    fail('languages must be a non-empty string array');
  }
  if (!isStrArray(v.tags)) fail('tags must be a string array');
  if (!VOICE_TIERS[v.tier]) {
    fail(`unknown tier "${v.tier}" — add it to VOICE_TIERS first`);
  }
  if (!VOICE_PROVIDERS[v.provider].tiers.includes(v.tier)) {
    fail(`provider "${v.provider}" does not support tier "${v.tier}"`);
  }
  if (!isBool(v.supportsWordTimestamps)) fail('supportsWordTimestamps must be a boolean');
  if (!isBool(v.supportsMultilingual))   fail('supportsMultilingual must be a boolean');
  if (!isBool(v.supportsEmotion))        fail('supportsEmotion must be a boolean');
  if (!v.defaultSettings || typeof v.defaultSettings !== 'object') {
    fail('defaultSettings must be an object');
  }
  if (!isStrArray(v.modelCompatibility) || !v.modelCompatibility.length) {
    fail('modelCompatibility must be a non-empty string array');
  }
  if (!['active', 'inactive', 'future'].includes(v.status)) {
    fail('status must be "active", "inactive", or "future"');
  }
  if (!isStr(v.createdAt) || !isStr(v.updatedAt)) {
    fail('createdAt/updatedAt must be ISO strings');
  }
  if (!v.metadata || typeof v.metadata !== 'object') fail('metadata must be an object');
  return v;
}
