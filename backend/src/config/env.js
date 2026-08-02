import 'dotenv/config';

// Single source of truth for everything that comes from the environment.
// No other module reads process.env directly — add new provider keys here.

const str = (name, fallback = '') => (process.env[name] ?? fallback).trim();
const num = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  port: num('PORT', 4000),
  logLevel: str('LOG_LEVEL', 'info'),

  elevenlabs: {
    apiKey: str('ELEVENLABS_API_KEY'),
    defaultVoiceId: str('ELEVENLABS_VOICE_ID'),
    hindiVoiceId: str('HINDI_VOICE_ID'),
  },

  // Comma-separated provider chain, e.g. "cloudflare,pollinations".
  // Empty = auto (every provider with credentials, keyless last).
  imageProviderChain: str('IMAGE_PROVIDER'),

  cloudflare: {
    apiToken: str('CLOUDFLARE_API_TOKEN'),
    accountId: str('CLOUDFLARE_ACCOUNT_ID'),
    imageModel: str('CLOUDFLARE_IMAGE_MODEL', '@cf/black-forest-labs/flux-1-schnell'),
  },
  gemini: {
    apiKey: str('GEMINI_API_KEY'),
    imageModel: str('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image'),
  },
  openai: {
    apiKey: str('OPENAI_API_KEY'),
    imageModel: str('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
  },
  bfl: {
    apiKey: str('BFL_API_KEY'),
    model: str('FLUX_MODEL', 'flux-dev'),
  },
  stability: {
    apiKey: str('STABILITY_API_KEY'),
    imageModel: str('STABILITY_IMAGE_MODEL', 'core'),
  },

  pexels: { apiKey: str('PEXELS_API_KEY') },
  pixabay: { apiKey: str('PIXABAY_API_KEY') },
};

/**
 * Warn (never crash) about configuration problems at startup.
 * Returns an array of human-readable warnings.
 */
export function validateEnv() {
  const warnings = [];
  if (!env.elevenlabs.apiKey) {
    warnings.push('ELEVENLABS_API_KEY is not set — voiceover generation will fail.');
  }
  return warnings;
}
