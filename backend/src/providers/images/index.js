import { env } from '../../config/env.js';
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  IMAGE_GEN_ATTEMPTS,
  IMAGE_GEN_RETRY_DELAY_MS,
} from '../../config/constants.js';
import { createLogger } from '../../utils/logger.js';
import { cloudflare } from './cloudflare.js';
import { gemini } from './gemini.js';
import { openai } from './openai.js';
import { flux } from './flux.js';
import { stability } from './stability.js';
import { pollinations } from './pollinations.js';

// AI image generation provider registry. Every provider implements:
//   name: string
//   available() -> boolean          (are its credentials/config present?)
//   generate({ prompt, outPath, seed, width, height }) -> writes image file, returns true
// generate() throws on failure; generateImage() below walks the chain.
//
// Selection is pure configuration — set IMAGE_PROVIDER in .env to a name or a
// comma-separated fallback chain, e.g.:
//   IMAGE_PROVIDER=cloudflare
//   IMAGE_PROVIDER=openai,cloudflare,pollinations
// If IMAGE_PROVIDER is unset, every provider with credentials is used in
// DEFAULT_ORDER, with keyless Pollinations always available as the last resort.
// To add a provider: create a file in this folder and register it here.

const log = createLogger('imagegen');

export const PROVIDERS = { cloudflare, gemini, openai, flux, stability, pollinations };

const DEFAULT_ORDER = ['cloudflare', 'gemini', 'openai', 'flux', 'stability', 'pollinations'];

const ALIASES = {
  'workers-ai': 'cloudflare',
  'stable-diffusion': 'stability',
  sd: 'stability',
  bfl: 'flux',
};

// Fixed look for the whole reel — keeps every generated shot in one visual world.
const STYLE_SUFFIX =
  'Cinematic documentary photograph, moody dramatic lighting, muted desaturated color grade with deep shadows, ' +
  'photorealistic, shallow depth of field, shot on 35mm film with subtle grain. ' +
  'Absolutely no text, no words, no numbers, no logos, no watermarks anywhere in the image. Vertical 9:16 composition.';

/** The configured provider chain: names from IMAGE_PROVIDER, or every credentialed provider. */
export function resolveChain() {
  const conf = env.imageProviderChain;
  if (conf) {
    return conf
      .split(',')
      .map((n) => n.trim().toLowerCase())
      .map((n) => ALIASES[n] || n)
      .filter((n) => {
        if (!PROVIDERS[n]) log.warn(`unknown IMAGE_PROVIDER "${n}" ignored`);
        return !!PROVIDERS[n];
      });
  }
  return DEFAULT_ORDER.filter((n) => PROVIDERS[n].available());
}

export function hasImageGen() {
  return resolveChain().length > 0;
}

/**
 * Generate one cinematic shot image, walking the provider chain with one retry
 * per provider. Returns true on success, null on total failure (callers fall
 * through to stock photos / icon scenes).
 */
export async function generateImage(prompt, outPath, { seed = 0 } = {}) {
  const full = `${prompt}. ${STYLE_SUFFIX}`;
  const job = { prompt: full, outPath, seed, width: VIDEO_WIDTH, height: VIDEO_HEIGHT };
  for (const name of resolveChain()) {
    const provider = PROVIDERS[name];
    if (!provider.available()) continue;
    for (let attempt = 0; attempt < IMAGE_GEN_ATTEMPTS; attempt++) {
      try {
        await provider.generate(job);
        return true;
      } catch (e) {
        if (attempt === IMAGE_GEN_ATTEMPTS - 1) log.error(`${name} failed:`, e.message);
        else await new Promise((r) => setTimeout(r, IMAGE_GEN_RETRY_DELAY_MS));
      }
    }
  }
  return null;
}
