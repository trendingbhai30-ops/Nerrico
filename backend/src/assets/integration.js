// Nerrico Asset Engine — integration seams (Phase 4A: interfaces only).
//
// Every subsystem obtains assets through these functions — never by touching
// the filesystem or building paths. The seams are deliberately thin and
// deterministic today:
//   - NO style-aware selection yet (Phase 4C: asset intelligence),
//   - NO downloading/providers (Phase 4B),
//   - Motion Engine behaviour is untouched — it may CALL these, nothing more.
//
// `requestAsset` is the one generic entry point; the per-subsystem wrappers
// exist so call sites read clearly and future intelligence lands in exactly
// one place per subsystem without touching callers.

import { assetRegistry } from './registry.js';
import { resolveInRegistry, resolvePathInRegistry } from './resolver.js';
import { searchRegistry } from './search.js';

/**
 * Generic asset request — id first, then ranked search.
 * @param {{id?: string, query?: string, category?: string, type?: string}} req
 * @returns {import('./schema.js').AssetRecord|null}
 */
export function requestAsset(req = {}) {
  if (req.id) {
    const byId = resolveInRegistry(assetRegistry, req.id);
    if (byId && (!req.category || byId.category === req.category)) return byId;
  }
  if (req.query) {
    const hits = searchRegistry(assetRegistry, req.query, { category: req.category, type: req.type, limit: 1 });
    if (hits.length) return hits[0].asset;
  }
  return null;
}

/** "paperReveal" → "paper reveal" — motion kinds are camelCase, assets are not. */
function decamel(name) {
  return String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

/**
 * Motion Engine seam: an SFX suggestion for a transition/effect kind or
 * preset name (e.g. "whip", "paperReveal"). Pure lookup today — the
 * kind→sound mapping table is Phase 4C. Null when nothing plausible exists.
 */
export function sfxForMotion(kindOrPreset) {
  return requestAsset({ category: 'sfx', query: decamel(kindOrPreset) });
}

/**
 * Style Bible seam: assets for a visual style. Phase 4A intentionally ignores
 * the style definition (style-aware selection is later) — it resolves the
 * request generically so call sites can already be written against this
 * signature.
 * @param {object} _style  A Style Bible definition (unused until Phase 4C).
 * @param {{id?: string, query?: string, category?: string}} req
 */
export function assetForStyle(_style, req) {
  return requestAsset(req);
}

/**
 * Planner seam: resolve a planner-emitted semantic reference
 * ("music.documentary.calm", "sfx.paper.rip", "icon.money") to a record.
 */
export function assetForPlanner(ref) {
  return resolveInRegistry(assetRegistry, ref);
}

/**
 * Planner seam: the vocabulary a future prompt legend can offer (mirrors the
 * Motion Engine's registry-sourced legends). Music/SFX are enumerable; icons
 * are far too many to list, so they're summarized by count + their tag pool.
 */
export function plannerAssetVocabulary() {
  const iconTags = new Set();
  for (const icon of assetRegistry.list({ category: 'icons' })) {
    for (const t of icon.tags) iconTags.add(t);
  }
  return {
    music: assetRegistry.listIds('music'),
    sfx: assetRegistry.listIds('sfx'),
    icons: { count: assetRegistry.listIds('icons').length, tags: [...iconTags].sort() },
  };
}

/**
 * Render seam: semantic ref → absolute file path (or null). What pipeline.js
 * will hand to Remotion when audio/icon layers arrive in later phases.
 */
export function assetPathForRender(ref) {
  return resolvePathInRegistry(assetRegistry, ref);
}
