// Nerrico Voice Engine — resolver (Phase 5A).
//
// Semantic resolution: a string such as "voice.george", "voice.documentary",
// or a raw provider voiceId ("JBFqnCBsd6RMkjVDRZzb") resolves to a frozen
// VoiceRecord — or null if nothing matches.
//
// Resolution order:
//   1. Exact registry id match        ("voice.george" → record)
//   2. Semantic alias lookup          ("voice.documentary" → "voice.george" → record)
//   3. Provider voiceId reverse-lookup  (raw ElevenLabs id → record, for backcompat)
//   4. Search fallback                (free-text, limit 1)
//   5. null

import { voiceRegistry } from './registry.js';
import { searchVoices } from './search.js';

// ---------------------------------------------------------------------------
// Semantic alias table
// ---------------------------------------------------------------------------
// Maps semantic category refs to canonical voice ids. These are STABLE — once
// published, a ref must keep resolving to the same result (or a clearly
// better voice added in a future phase). The planner and intelligence layer
// use these; provider ids never appear in scripts, prompts, or project JSON.

export const SEMANTIC_VOICE_REFS = Object.freeze({
  // English narrative voices
  'voice.narrator':     'voice.george',
  'voice.documentary':  'voice.george',
  'voice.story':        'voice.george',
  'voice.news':         'voice.george',
  'voice.calm':         'voice.george',
  'voice.deep':         'voice.george',

  // Professional / broadcast voices
  'voice.realestate':   'voice.sarah',
  'voice.finance':      'voice.sarah',
  'voice.corporate':    'voice.sarah',
  'voice.professional': 'voice.sarah',
  'voice.warm':         'voice.sarah',

  // Energetic / tech voices
  'voice.tech':         'voice.adam',
  'voice.energetic':    'voice.adam',
  'voice.conversational': 'voice.adam',
  'voice.dynamic':      'voice.adam',

  // Language-specific aliases
  'voice.english':      'voice.george',
  'voice.hinglish':     'voice.adam',
  'voice.hindi':        'voice.viraj',
  'voice.multilingual': 'voice.adam',
});

/**
 * Resolve any voice reference to a VoiceRecord.
 *
 * Accepts:
 *   - A semantic id:   "voice.george"
 *   - A semantic ref:  "voice.documentary"
 *   - A raw provider voiceId: "JBFqnCBsd6RMkjVDRZzb"  (backwards compat)
 *   - Free text:       "british narrator"  (search fallback)
 *
 * @param {string} ref
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {import('./schema.js').VoiceRecord|null}
 */
export function resolveVoice(ref, registry = voiceRegistry) {
  if (!ref || typeof ref !== 'string') return null;
  const clean = ref.trim();

  // 1. Exact id match
  const exact = registry.get(clean);
  if (exact) return exact;

  // 2. Semantic alias table
  const aliasTarget = SEMANTIC_VOICE_REFS[clean];
  if (aliasTarget) {
    const aliased = registry.get(aliasTarget);
    if (aliased) return aliased;
  }

  // 3. Reverse-lookup by raw provider voiceId (e.g. "JBFqnCBsd6RMkjVDRZzb")
  //    Keeps old project.json files (which store the raw ElevenLabs voiceId)
  //    working after Phase 5B wires the pipeline to the new registry.
  const byProviderId = resolveByProviderId(null, clean, registry);
  if (byProviderId) return byProviderId;

  // 4. Free-text search fallback (limit 1)
  const hits = searchVoices(clean, { registry, limit: 1 });
  return hits.length ? hits[0].voice : null;
}

/**
 * Reverse-lookup: given a provider-native voiceId, find the VoiceRecord.
 * Provider may be null to search across all providers.
 * Returns null when no registered voice carries that native id.
 *
 * This is the backwards-compatibility bridge for Phase 5B: existing
 * project.json files store the raw ElevenLabs voiceId; the pipeline
 * uses this function to resolve it to a full VoiceRecord.
 *
 * @param {string|null} provider  e.g. "elevenlabs", or null for any provider
 * @param {string} providerVoiceId  e.g. "JBFqnCBsd6RMkjVDRZzb"
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {import('./schema.js').VoiceRecord|null}
 */
export function resolveByProviderId(provider, providerVoiceId, registry = voiceRegistry) {
  if (!providerVoiceId) return null;
  const candidates = provider
    ? registry.list({ provider, status: null })   // status:null = all statuses
    : registry.list({});
  return candidates.find((v) => v.voiceId === providerVoiceId) || null;
}
