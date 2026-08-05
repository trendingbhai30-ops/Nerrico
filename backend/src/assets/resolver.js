// Nerrico Asset Engine — resolver.
//
// Scenes, styles and the planner never handle file paths — they ask for a
// semantic id and get an AssetRecord (or null; unknown references must never
// crash a render, mirroring registry semantics everywhere else).
//
// Resolution order for e.g. "music.documentary.calm":
//   1. Exact registered id ("sfx.paper-ripping", "icon.coin.filled").
//   2. Semantic lookup: first segment names a category (music/sfx/icon...),
//      the remaining segments are search terms — top-ranked hit wins.
//   3. Relaxed retries, most-generic term dropped first (leading segments are
//      broad descriptors, the last segment is the specific ask — same
//      trailing/leading relaxation idea as the Commons search retries).
//   4. Whole-string search across all categories.

import { CATEGORY_ALIASES } from './schema.js';
import { searchRegistry } from './search.js';
import { assetAbsolutePath } from './paths.js';

/**
 * @param {ReturnType<import('./registry.js').createAssetRegistry>} registry
 * @param {string} ref  Exact id or semantic dotted reference.
 * @returns {import('./schema.js').AssetRecord|null}
 */
export function resolveInRegistry(registry, ref) {
  if (!ref || typeof ref !== 'string') return null;
  const clean = ref.trim().toLowerCase();

  const exact = registry.get(clean);
  if (exact) return exact;

  // Registered ids are all-lowercase, so camelCase can only appear in semantic
  // refs ("sfx.paperRip") — split the humps into segments before searching.
  const segments = ref
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
    .toLowerCase()
    .split('.')
    .filter(Boolean);
  const category = CATEGORY_ALIASES[segments[0]];
  if (category && segments.length > 1) {
    const terms = segments.slice(1);
    // Full AND first, then drop the most-generic (leading) term one at a time.
    for (let drop = 0; drop < terms.length; drop++) {
      const hits = searchRegistry(registry, terms.slice(drop).join(' '), { category, limit: 1 });
      if (hits.length) return hits[0].asset;
    }
  }

  const fallback = searchRegistry(registry, segments.join(' '), { limit: 1 });
  return fallback.length ? fallback[0].asset : null;
}

/**
 * Resolve straight to an absolute file path (or null). The only sanctioned
 * way for pipeline/render code to turn a semantic id into a real file.
 */
export function resolvePathInRegistry(registry, ref, rootDir) {
  const asset = resolveInRegistry(registry, ref);
  return asset ? assetAbsolutePath(asset, rootDir) : null;
}
