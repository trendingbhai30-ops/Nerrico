// Nerrico Style Bible — registry.
//
// The visual-intelligence counterpart of the Motion Registry: every visual
// style is a frozen, validated DEFINITION (structured data, zero prose
// templates) registered here. The planner reads definitions; it never invents
// visual language of its own. Adding a style = one file in styles/ with one
// register() call — planner logic never changes.
//
// Mirrors remotion/motion/registry.js semantics: duplicate names throw at
// registration (a programmer error), unknown lookups return null (content
// input must never crash), and definitions are deep-frozen so per-request
// code can share them safely.

import { validateStyleDefinition } from './schema.js';

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(obj);
}

const styles = new Map();

export const styleBible = {
  /** Validate + freeze + store a style definition. Throws on invalid/duplicate. */
  register(def) {
    validateStyleDefinition(def);
    if (styles.has(def.name)) {
      throw new Error(`Style Bible: duplicate style "${def.name}"`);
    }
    styles.set(def.name, deepFreeze(def));
    return def;
  },

  /** @returns {object|null} frozen definition, or null when unknown. */
  get(name) {
    return styles.get(name) || null;
  },

  has(name) {
    return styles.has(name);
  },

  /** All registered style names (including status 'future'). */
  list() {
    return [...styles.keys()];
  },

  /** Names selectable today — status 'future' styles are declared, not offered. */
  listActive() {
    return [...styles.values()].filter((s) => s.status === 'active').map((s) => s.name);
  },
};
