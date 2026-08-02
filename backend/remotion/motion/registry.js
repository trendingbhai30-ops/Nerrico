// Nerrico Motion Engine (NME) — central registry.
//
// Every motion the engine knows about — camera moves, transitions, effects,
// presets — is registered here under its category. Adding a new motion is:
//   1. define it in its category module (camera/, transitions/, effects/),
//   2. call motionRegistry.register(...) there.
// Nothing else in the engine changes; dispatch and resolution find it by name.

import { deepFreeze } from './utils.js';

/** Categories of registrable entries. 'preset' holds named configs, not code. */
export const MOTION_CATEGORIES = Object.freeze(['camera', 'transition', 'effect', 'preset']);

/** @type {Map<string, Map<string, object>>} */
const store = new Map(MOTION_CATEGORIES.map((c) => [c, new Map()]));

function categoryMap(category) {
  const map = store.get(category);
  if (!map) {
    throw new Error(
      `[motion] Unknown category "${category}". Valid: ${MOTION_CATEGORIES.join(', ')}`
    );
  }
  return map;
}

export const motionRegistry = {
  /**
   * Register a motion definition or preset. Entries are deep-frozen; names
   * are unique per category (re-registering a name is an error — motions are
   * declared once, at module load).
   * @param {string} category
   * @param {object} entry  Must have a string `name`.
   */
  register(category, entry) {
    const map = categoryMap(category);
    if (!entry || typeof entry.name !== 'string' || !entry.name) {
      throw new Error(`[motion] register(${category}): entry needs a string "name"`);
    }
    if (map.has(entry.name)) {
      throw new Error(`[motion] Duplicate ${category} "${entry.name}"`);
    }
    map.set(entry.name, deepFreeze(entry));
    return entry;
  },

  /** @returns {object|null} the registered entry, or null (callers degrade gracefully). */
  get(category, name) {
    return categoryMap(category).get(name) || null;
  },

  has(category, name) {
    return categoryMap(category).has(name);
  },

  /** @returns {string[]} registered names in a category. */
  list(category) {
    return [...categoryMap(category).keys()];
  },

  /** Human/debug summary of everything registered (used by tests & tooling). */
  describe() {
    const out = {};
    for (const [category, map] of store) {
      out[category] = [...map.values()].map((e) => ({
        name: e.name,
        status: e.status || 'config',
        description: e.description || '',
      }));
    }
    return out;
  },
};
