// Nerrico Motion Engine (NME) — configuration & resolution.
//
// Single place where a MotionSpec (what a preset/planner/style wrote) becomes
// a ResolvedMotion (what per-frame code consumes). Resolution order, lowest
// to highest priority:
//
//   GLOBAL_MOTION_DEFAULTS  →  preset config  →  definition param defaults  →  per-use spec
//
// resolveMotion() is the expensive step (object merges, lookups) and is meant
// to run ONCE per scene — never per frame. The result is frozen and safe to
// share.

import { motionRegistry } from './registry.js';
import { getEasing } from './timing.js';
import { deepFreeze, warnOnce } from './utils.js';

/** Global defaults for every motion. Override per style/preset/spec, not here. */
export const GLOBAL_MOTION_DEFAULTS = deepFreeze({
  durationInSeconds: null, // null = span the whole scene
  delayInSeconds: 0,
  easing: 'easeInOut',
  direction: 'in',
  intensity: 1,
  speed: 1,
});

/**
 * Resolve a motion spec against presets, registered definitions, and global
 * defaults. Never throws on bad content input: unknown presets/kinds resolve
 * to a definition-less motion (dispatchers then return identity states), with
 * a one-time warning. Malformed numbers fall back to defaults.
 *
 * @param {import('./types.js').MotionSpec | string | null | undefined} spec
 *        A spec object, or a bare preset name as shorthand ('slowZoom').
 * @param {{category?: string}} [context]  Category to assume when the spec
 *        names a kind without one (e.g. camera dispatch passes 'camera').
 * @returns {import('./types.js').ResolvedMotion}
 */
export function resolveMotion(spec, context = {}) {
  if (typeof spec === 'string') spec = { preset: spec };
  spec = spec || {};

  // 1. Preset layer.
  let presetConfig = null;
  if (spec.preset) {
    const preset = motionRegistry.get('preset', spec.preset);
    if (preset) presetConfig = preset.config;
    else warnOnce(`preset:${spec.preset}`, `Unknown preset "${spec.preset}" — using defaults`);
  }

  const pick = (key) => spec[key] ?? presetConfig?.[key] ?? GLOBAL_MOTION_DEFAULTS[key];

  // 2. Find the definition (category may come from spec, preset, or context).
  const category = spec.category ?? presetConfig?.category ?? context.category ?? null;
  const kind = spec.kind ?? presetConfig?.kind ?? null;
  let def = null;
  if (category && kind) {
    def = motionRegistry.get(category, kind);
    if (!def) warnOnce(`kind:${category}/${kind}`, `Unknown ${category} "${kind}" — motion disabled`);
  }

  // 3. Merge params: definition defaults ← preset ← spec.
  const params = {};
  if (def) for (const [k, p] of Object.entries(def.params)) params[k] = p.default;
  if (presetConfig?.params) Object.assign(params, presetConfig.params);
  if (spec.params) Object.assign(params, spec.params);

  const easing = pick('easing');
  return deepFreeze({
    category,
    kind,
    def,
    durationInSeconds: numberOrNull(pick('durationInSeconds')),
    delayInSeconds: numberOr(pick('delayInSeconds'), 0),
    easing,
    easingFn: getEasing(easing),
    direction: pick('direction'),
    intensity: numberOr(pick('intensity'), 1),
    speed: numberOr(pick('speed'), 1) || 1, // guard speed 0 → 1 (0 would freeze progress)
    params,
  });
}

const numberOr = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numberOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
