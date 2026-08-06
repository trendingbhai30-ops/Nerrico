// Nerrico Voice Engine — intelligence (Phase 5A).
//
// The decision layer that turns the passive voice registry into an intelligent
// selector. Three mapping tables — language defaults, mode+language preferences,
// style hints — are pure data resolved through the registry at request time.
// Nothing here is random; nothing names a provider voiceId directly.
//
// Deliberately NOT here: TTS calls, provider upgrades, pipeline wiring.
// Those belong to Phase 5B. This module only decides WHICH voice to use.

import { voiceRegistry } from './registry.js';
import { resolveVoice, SEMANTIC_VOICE_REFS } from './resolver.js';

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(obj);
}

// ---------------------------------------------------------------------------
// 1. Language defaults
// ---------------------------------------------------------------------------
// The engine-level voice for each language code when no mode preference
// and no project/user override is present.

export const LANGUAGE_DEFAULTS = deepFreeze({
  english:      'voice.george',
  hinglish:     'voice.adam',      // free-tier multilingual fallback
  hindi:        'voice.viraj',     // library voice — gated at render time in 5B
  multilingual: 'voice.adam',
});

/** Engine fallback — used when every other tier fails to resolve. */
export const ENGINE_FALLBACK_VOICE = 'voice.george';

// ---------------------------------------------------------------------------
// 2. Mode + language preference table
// ---------------------------------------------------------------------------
// One entry per content mode, mapping each language to a preferred semantic
// voice id. When a voice resolves to null (e.g. Viraj on free tier), the
// resolver falls through to the language default automatically.

export const MODE_VOICE_PREFERENCES = deepFreeze({
  normal: {
    english:  'voice.george',   // authoritative British narrator
    hinglish: 'voice.adam',     // energetic multilingual
    hindi:    'voice.viraj',    // Hindi documentary narrator (library)
  },
  realestate: {
    english:  'voice.sarah',    // professional warm US female
    hinglish: 'voice.adam',     // conversational multilingual
    hindi:    'voice.viraj',    // Hindi (library — paid plan required)
  },
});

// ---------------------------------------------------------------------------
// 3. Style → voice hints  (non-binding; overridden by mode + language)
// ---------------------------------------------------------------------------
// A visual style may suggest a voice character. These are hints only — the
// selectVoice() policy chain gives mode+language precedence over style.

export const STYLE_VOICE_HINTS = deepFreeze({
  'paper-collage':  'voice.george',
  cinematic:        'voice.george',
  documentary:      'voice.george',
  'ai-documentary': 'voice.adam',
  history:          'voice.george',
  finance:          'voice.sarah',
  'modern-tech':    'voice.adam',
  luxury:           'voice.sarah',
  minimal:          'voice.sarah',
});

// ---------------------------------------------------------------------------
// 4. selectVoice() — the main policy function
// ---------------------------------------------------------------------------
//
// Priority chain (first tier that resolves an active registry record wins):
//   user     explicit voiceId / semantic ref passed at request time
//   project  per-project stored voiceId (from project.json, raw or semantic)
//   mode     MODE_VOICE_PREFERENCES[mode][language]
//   language LANGUAGE_DEFAULTS[language]
//   engine   ENGINE_FALLBACK_VOICE
//
// Returns a structured result with a trail — mirrors selectMusic().

/**
 * @param {{
 *   user?: string|null,
 *   project?: string|null,
 *   mode?: string|null,
 *   language?: string|null,
 *   style?: string|null,
 *   registry?: ReturnType<import('./registry.js').createVoiceRegistry>
 * }} [opts]
 * @returns {{
 *   policy: 'explicit'|'project'|'mode'|'language'|'engine',
 *   source: 'user'|'project'|'mode'|'language'|'engine',
 *   ref: string|null,
 *   voiceId: string|null,
 *   voice: import('./schema.js').VoiceRecord|null,
 *   trail: string[]
 * }}
 */
export function selectVoice({
  user     = null,
  project  = null,
  mode     = null,
  language = null,
  style    = null,   // hint only — not yet used in the chain, reserved for 5B
  registry = voiceRegistry,
} = {}) {
  const trail = [];

  const decided = (policy, source, ref, voice) => ({
    policy, source, ref,
    voiceId: voice ? voice.voiceId : null,
    voice:   voice || null,
    trail,
  });

  const tryResolve = (ref, label) => {
    if (!ref) return null;
    const v = resolveVoice(ref, registry);
    if (v && v.status === 'active') return v;
    if (v) trail.push(`${label}: "${ref}" → "${v.id}" status "${v.status}" — skipping`);
    return null;
  };

  // Tier 1 — user explicit choice
  if (user) {
    const v = tryResolve(user, 'user');
    if (v) return decided('explicit', 'user', user, v);
    trail.push(`user: "${user}" did not resolve to an active voice — falling through`);
  } else {
    trail.push('user: no choice');
  }

  // Tier 2 — project stored voiceId (raw provider id or semantic ref)
  if (project) {
    const v = tryResolve(project, 'project');
    if (v) return decided('project', 'project', project, v);
    trail.push(`project: "${project}" did not resolve — falling through`);
  } else {
    trail.push('project: no stored voice');
  }

  // Tier 3 — mode + language preference
  const modeKey  = String(mode     || '').toLowerCase();
  const langKey  = String(language || 'english').toLowerCase();
  const modePrefs = MODE_VOICE_PREFERENCES[modeKey];
  if (modePrefs && modePrefs[langKey]) {
    const v = tryResolve(modePrefs[langKey], `mode(${modeKey}+${langKey})`);
    if (v) return decided('mode', 'mode', modePrefs[langKey], v);
    trail.push(`mode "${modeKey}" + language "${langKey}": "${modePrefs[langKey]}" unresolved — falling through`);
  } else {
    trail.push(`mode "${modeKey}" has no preference for language "${langKey}"`);
  }

  // Tier 4 — language default
  const langDefault = LANGUAGE_DEFAULTS[langKey];
  if (langDefault) {
    const v = tryResolve(langDefault, `language(${langKey})`);
    if (v) return decided('language', 'language', langDefault, v);
    trail.push(`language default "${langDefault}" unresolved — falling through`);
  } else {
    trail.push(`no language default for "${langKey}"`);
  }

  // Tier 5 — engine fallback
  const fallback = tryResolve(ENGINE_FALLBACK_VOICE, 'engine');
  if (fallback) return decided('engine', 'engine', ENGINE_FALLBACK_VOICE, fallback);

  trail.push('engine: fallback not found in registry — no voice available');
  return decided('engine', 'engine', null, null);
}

// ---------------------------------------------------------------------------
// 5. Planner vocabulary helper
// ---------------------------------------------------------------------------

/**
 * All semantic voice refs whose target is active in the registry.
 * Sorted for determinism. The planner uses this to emit semantic refs,
 * never provider voiceIds.
 *
 * @param {ReturnType<import('./registry.js').createVoiceRegistry>} [registry]
 * @returns {string[]}
 */
export function plannerVoiceVocabulary(registry = voiceRegistry) {
  return Object.keys(SEMANTIC_VOICE_REFS)
    .filter((ref) => {
      const targetId = SEMANTIC_VOICE_REFS[ref];
      const v = registry.get(targetId);
      return v && v.status === 'active';
    })
    .sort();
}
