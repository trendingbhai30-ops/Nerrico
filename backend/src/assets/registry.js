// Nerrico Asset Engine — registry.
//
// The single source of truth for every asset the pipeline may use. Mirrors
// the Motion Registry / Style Bible semantics: duplicate ids throw (an
// importer bug), unknown lookups return null (content input must never
// crash), records are deep-frozen so per-request code can share them safely.
//
// A factory is exported for tests (fixture imports get their own registry);
// production code uses the `assetRegistry` singleton via index.js.

import { validateAssetRecord } from './schema.js';

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(obj);
}

export function createAssetRegistry() {
  /** @type {Map<string, import('./schema.js').AssetRecord>} */
  const assets = new Map();
  /** @type {Map<string, string[]>} category → ids, in registration order */
  const byCategory = new Map();

  return {
    /** Validate + freeze + store. Throws on invalid record or duplicate id. */
    register(record) {
      validateAssetRecord(record);
      if (assets.has(record.id)) {
        throw new Error(`Asset Engine: duplicate asset id "${record.id}"`);
      }
      assets.set(record.id, deepFreeze(record));
      if (!byCategory.has(record.category)) byCategory.set(record.category, []);
      byCategory.get(record.category).push(record.id);
      return record;
    },

    /** @returns {import('./schema.js').AssetRecord|null} frozen record or null. */
    get(id) {
      return assets.get(id) || null;
    },

    has(id) {
      return assets.has(id);
    },

    /** All records, optionally filtered. @param {{category?: string, type?: string}} [filter] */
    list(filter = {}) {
      let all = [...assets.values()];
      if (filter.category) all = all.filter((a) => a.category === filter.category);
      if (filter.type) all = all.filter((a) => a.type === filter.type);
      return all;
    },

    /** Ids in one category, registration order. */
    listIds(category) {
      return [...(byCategory.get(category) || [])];
    },

    size() {
      return assets.size;
    },

    /** Registered-count per category, for summaries. */
    stats() {
      const out = {};
      for (const [cat, ids] of byCategory) out[cat] = ids.length;
      return out;
    },

    /** Remove everything — used by re-imports and tests. */
    clear() {
      assets.clear();
      byCategory.clear();
    },
  };
}

/** The production singleton every subsystem shares. */
export const assetRegistry = createAssetRegistry();
