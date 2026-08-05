// Nerrico Asset Engine — integration seams.
//
// Every subsystem obtains assets through these functions — never by touching
// the filesystem or building paths. Phase 4A shipped these as thin generic
// lookups; Phase 4B routed them through the intelligence layer
// (intelligence.js): motion names map to semantic sound events, styles carry
// asset preferences, and the resolver picks the best local match. Signatures
// are unchanged — Phase 4A callers behave identically; the style parameters
// are optional extensions. Motion Engine behaviour is untouched — it may
// CALL these, nothing more.

import { assetRegistry } from './registry.js';
import { resolveInRegistry, resolvePathInRegistry } from './resolver.js';
import { searchRegistry } from './search.js';
import {
  motionSfxEvent,
  stylePreferencesFor,
  resolveInCategory,
  musicCategoryVocabulary,
  listMotionSfxEvents,
  plannerSfxVocabulary,
} from './intelligence.js';

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
 * Motion Engine seam: the SFX for a transition/camera kind or preset name
 * (e.g. "whip", "paperReveal", "impactShake"). Phase 4B: routed through the
 * semantic event table (MOTION_SFX_EVENTS) with the style's overrides and
 * sfxLevel applied — pass the project's Style Bible definition (or name) to
 * get style-aware sound. Unmapped-but-registered motions stay silent by
 * design; names the Motion Engine doesn't know fall back to the Phase 4A
 * ranked search so old callers see the old behaviour. Null = no sound.
 */
export function sfxForMotion(kindOrPreset, styleOrName = null) {
  const event = motionSfxEvent(kindOrPreset, styleOrName);
  if (event) return event.sfx ? resolveInCategory(assetRegistry, event.sfx, 'sfx') : null;
  return requestAsset({ category: 'sfx', query: decamel(kindOrPreset) });
}

/**
 * Style Bible seam: assets for a visual style. Phase 4B: the style's
 * preference entry (STYLE_ASSET_PREFERENCES) now shapes the answer —
 *   - a bare music request ({category:'music'}) returns the style's default track,
 *   - icon searches that find nothing are retried with the style's flavor
 *     terms (broadening, never diluting a query that already hits), and the
 *     style's preferred variant (outline/filled) wins when a sibling exists,
 *   - everything else resolves exactly as before.
 * @param {object|string|null} style  A Style Bible definition or name.
 * @param {{id?: string, query?: string, category?: string, type?: string}} req
 */
export function assetForStyle(style, req = {}) {
  const prefs = stylePreferencesFor(style);
  if (req.category === 'music' && !req.id && !req.query) {
    return resolveInCategory(assetRegistry, prefs.music, 'music');
  }
  let found = requestAsset(req);
  if (!found && req.category === 'icons' && req.query && prefs.iconTerms.length) {
    found = requestAsset({ ...req, query: prefs.iconTerms.join(' ') });
  }
  if (found && found.category === 'icons' && prefs.iconVariant === 'filled') {
    const filledSibling = assetRegistry.get(`${found.id}.filled`);
    if (filledSibling) return filledSibling;
  }
  return found;
}

/**
 * Planner seam: resolve a planner-emitted semantic reference
 * ("music.documentary.calm", "sfx.paper.rip", "icon.money") to a record.
 */
export function assetForPlanner(ref) {
  return resolveInRegistry(assetRegistry, ref);
}

/**
 * Planner seam: the vocabulary the prompt legends offer (mirrors the Motion
 * Engine's registry-sourced legends). Music/SFX are enumerable; icons are far
 * too many to list, so they're summarized by count + their tag pool.
 * Phase 4B adds the SEMANTIC vocabulary — all registry-derived, so it expands
 * automatically as the library grows — under keys that Phase 4A callers never
 * read (the original shape is untouched):
 *   musicCategories  "music.<tag>" refs the music policy accepts
 *   sfxEvents        the motion→sound event table, style gating applied
 *   plannerSfx       per-shot content-accent ids shotsPrompt offers
 * @param {object|string|null} [styleOrName]  Style Bible definition or name.
 */
export function plannerAssetVocabulary(styleOrName = null) {
  const iconTags = new Set();
  for (const icon of assetRegistry.list({ category: 'icons' })) {
    for (const t of icon.tags) iconTags.add(t);
  }
  return {
    music: assetRegistry.listIds('music'),
    sfx: assetRegistry.listIds('sfx'),
    icons: { count: assetRegistry.listIds('icons').length, tags: [...iconTags].sort() },
    musicCategories: musicCategoryVocabulary(assetRegistry),
    sfxEvents: listMotionSfxEvents(styleOrName),
    plannerSfx: plannerSfxVocabulary(styleOrName, assetRegistry),
  };
}

/**
 * Render seam: semantic ref → absolute file path (or null). What pipeline.js
 * will hand to Remotion when audio/icon layers arrive in later phases.
 */
export function assetPathForRender(ref) {
  return resolvePathInRegistry(assetRegistry, ref);
}
