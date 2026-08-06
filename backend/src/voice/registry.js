// Nerrico Voice Engine — registry (Phase 5A).
//
// The single source of truth for every voice the pipeline may use. Mirrors
// the Motion Registry / Style Bible / Asset Engine semantics exactly:
//   • duplicate ids throw (a definition error, not a runtime error)
//   • unknown lookups return null (content input must never crash a render)
//   • records are deep-frozen so shared references are always safe
//
// A factory is exported for tests (each fixture gets its own registry);
// production code uses the `voiceRegistry` singleton via index.js.

import { validateVoiceRecord } from './schema.js';

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(obj);
}

export function createVoiceRegistry() {
  /** @type {Map<string, import('./schema.js').VoiceRecord>} id → record */
  const voices = new Map();
  /** @type {Map<string, string[]>} provider → ids, in registration order */
  const byProvider = new Map();

  return {
    /** Validate + freeze + store. Throws on invalid record or duplicate id. */
    register(record) {
      validateVoiceRecord(record);
      if (voices.has(record.id)) {
        throw new Error(`Voice Engine: duplicate voice id "${record.id}"`);
      }
      voices.set(record.id, deepFreeze(record));
      if (!byProvider.has(record.provider)) byProvider.set(record.provider, []);
      byProvider.get(record.provider).push(record.id);
      return record;
    },

    /** @returns {import('./schema.js').VoiceRecord|null} frozen record or null */
    get(id) {
      return voices.get(id) || null;
    },

    has(id) {
      return voices.has(id);
    },

    /**
     * All records, optionally filtered.
     * @param {{ provider?: string, tier?: string, language?: string,
     *           gender?: string, status?: string }} [filter]
     */
    list(filter = {}) {
      let all = [...voices.values()];
      if (filter.provider)  all = all.filter((v) => v.provider === filter.provider);
      if (filter.tier)      all = all.filter((v) => v.tier === filter.tier);
      if (filter.language)  all = all.filter((v) => v.languages.includes(filter.language));
      if (filter.gender)    all = all.filter((v) => v.gender === filter.gender);
      if (filter.status)    all = all.filter((v) => v.status === filter.status);
      return all;
    },

    /** Ids registered for one provider, in registration order. */
    listIds(provider) {
      return [...(byProvider.get(provider) || [])];
    },

    size() {
      return voices.size;
    },

    /** Registered-count per provider — for summaries and tests. */
    stats() {
      const out = {};
      for (const [prov, ids] of byProvider) out[prov] = ids.length;
      return out;
    },

    /** Remove everything — used by re-imports and tests. */
    clear() {
      voices.clear();
      byProvider.clear();
    },
  };
}

/** The production singleton every subsystem shares. */
export const voiceRegistry = createVoiceRegistry();
