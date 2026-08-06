// Nerrico Voice Engine — integration seams (Phase 5A).
//
// Clean interfaces for the subsystems that will consume the Voice Engine.
// These seams are INTERFACES ONLY in Phase 5A — nothing calls them in
// production yet. Phase 5B (provider upgrade) and 5C (API surface) will
// wire these into pipeline.js, elevenlabs.js, and the routes.
//
// Pattern mirrors src/assets/integration.js exactly.

import { voiceRegistry } from './registry.js';
import { resolveVoice, resolveByProviderId } from './resolver.js';
import { searchVoices } from './search.js';
import {
  selectVoice,
  plannerVoiceVocabulary,
  LANGUAGE_DEFAULTS,
  MODE_VOICE_PREFERENCES,
} from './intelligence.js';

// ---------------------------------------------------------------------------
// Pipeline seam — Phase 5B wires this into core/pipeline.js stepVoice()
// ---------------------------------------------------------------------------

/**
 * Resolve the voice a project should use for TTS generation.
 *
 * Phase 5B usage (not yet active):
 *   const { voice } = voiceForPipeline({ project, mode, language });
 *   await generateVoiceover({ ..., voiceId: voice.voiceId, modelId: voice.metadata.elevenLabsModel });
 *
 * @param {{
 *   user?: string|null,
 *   project?: string|null,
 *   mode?: string|null,
 *   language?: string|null,
 *   registry?: ReturnType<import('./registry.js').createVoiceRegistry>
 * }} opts
 * @returns {ReturnType<import('./intelligence.js').selectVoice>}
 */
export function voiceForPipeline(opts = {}) {
  return selectVoice({ ...opts, registry: opts.registry || voiceRegistry });
}

// ---------------------------------------------------------------------------
// Backwards compat seam — used by Phase 5B to look up old project.json data
// ---------------------------------------------------------------------------

/**
 * Given the raw ElevenLabs voiceId stored in an existing project.json file,
 * return the full VoiceRecord (or null if unrecognised).
 * This is the bridge between pre-5A stored data and the new registry.
 *
 * @param {string} rawVoiceId  e.g. "JBFqnCBsd6RMkjVDRZzb"
 * @param {string} [provider]  defaults to "elevenlabs"
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {import('./schema.js').VoiceRecord|null}
 */
export function voiceForLegacyId(rawVoiceId, provider = 'elevenlabs', registry = voiceRegistry) {
  return resolveByProviderId(provider, rawVoiceId, registry);
}

// ---------------------------------------------------------------------------
// Mode seam — default voice for a mode + language combination
// ---------------------------------------------------------------------------

/**
 * The voice the engine would pick for a given mode + language without any
 * user/project preference. Used by GET /api/voices/defaults (Phase 5C).
 *
 * @param {string} mode      e.g. "normal", "realestate"
 * @param {string} language  e.g. "english", "hinglish", "hindi"
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {import('./schema.js').VoiceRecord|null}
 */
export function voiceForMode(mode, language, registry = voiceRegistry) {
  const result = selectVoice({ mode, language, registry });
  return result.voice;
}

// ---------------------------------------------------------------------------
// Planner seam — semantic vocabulary for the shot planner
// ---------------------------------------------------------------------------

/**
 * The semantic voice refs the planner may emit — never provider voiceIds.
 * The planner uses this vocabulary in the scene/shot spec; the pipeline
 * resolves the ref to a full VoiceRecord before the TTS call.
 *
 * @param {string} [mode]
 * @param {string} [language]
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {string[]}
 */
export function plannerVoiceSeam(mode, language, registry = voiceRegistry) {
  return plannerVoiceVocabulary(registry);
}

// ---------------------------------------------------------------------------
// Search seam — free-text voice discovery
// ---------------------------------------------------------------------------

/**
 * Find voices matching a query, optionally filtered by provider/tier/language.
 * Used by the API routes (Phase 5C) and future frontend pickers.
 *
 * @param {string} query
 * @param {object} [opts]
 * @returns {import('./search.js').searchVoices extends (...args: any[]) => infer R ? R : never}
 */
export function requestVoice(query, opts = {}) {
  return searchVoices(query, { ...opts, registry: opts.registry || voiceRegistry });
}
