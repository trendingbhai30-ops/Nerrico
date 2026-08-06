// Nerrico Voice Engine — public API (Phase 5A).
//
// The single import point for every consumer of the Voice Engine.
// Importing this module registers all built-in voice definitions as a
// side effect (mirrors src/content/stylebible/index.js).
//
// Phase 5B adds: voiceForPipeline(), voiceForLegacyId() wired into pipeline.
// Phase 5C adds: API routes reading listActiveVoices(), voiceOptions().

// Side-effect: register all built-in voices into the voiceRegistry singleton.
import './definitions/index.js';

export { voiceRegistry, createVoiceRegistry } from './registry.js';
export { VOICE_PROVIDERS, VOICE_TIERS, validateVoiceRecord } from './schema.js';
export { resolveVoice, resolveByProviderId, SEMANTIC_VOICE_REFS } from './resolver.js';
export { searchVoices } from './search.js';
export { validateVoiceRegistry } from './validate.js';
export {
  selectVoice,
  plannerVoiceVocabulary,
  LANGUAGE_DEFAULTS,
  ENGINE_FALLBACK_VOICE,
  MODE_VOICE_PREFERENCES,
  STYLE_VOICE_HINTS,
} from './intelligence.js';
export {
  voiceForPipeline,
  voiceForLegacyId,
  voiceForMode,
  plannerVoiceSeam,
  requestVoice,
} from './integration.js';

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

import { voiceRegistry } from './registry.js';

/**
 * All active voices — the default list for API responses and pickers.
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {import('./schema.js').VoiceRecord[]}
 */
export function listActiveVoices(registry = voiceRegistry) {
  return registry.list({ status: 'active' });
}

/**
 * The structured options payload for GET /api/options and GET /api/voices.
 * Mirrors the shape of visualStyleOptions() and musicCategoryVocabulary().
 *
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {{
 *   voices: Array<{ id: string, displayName: string, provider: string,
 *                   gender: string|null, accent: string, languages: string[],
 *                   tags: string[], tier: string, freeTierAvailable: boolean,
 *                   freeNote: string|null }>,
 *   providers: string[],
 *   tiers: string[]
 * }}
 */
export function voiceOptions(registry = voiceRegistry) {
  const active = registry.list({ status: 'active' });
  const providers = [...new Set(active.map((v) => v.provider))].sort();
  const tiers     = [...new Set(active.map((v) => v.tier))].sort();

  return {
    voices: active.map((v) => ({
      id:               v.id,
      displayName:      v.displayName,
      provider:         v.provider,
      gender:           v.gender,
      accent:           v.accent,
      languages:        v.languages,
      tags:             v.tags,
      tier:             v.tier,
      freeTierAvailable: v.metadata.freeTierAvailable === true,
      freeNote:         v.metadata.freeNote || null,
    })),
    providers,
    tiers,
  };
}
