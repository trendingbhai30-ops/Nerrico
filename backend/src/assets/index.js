// Nerrico Asset Engine — public API.
//
// Import surface for everything outside assets/:
//   import { initAssetEngine, assetRegistry, resolveAsset, searchAssets, ... }
//     from '../assets/index.js'
//
// Unlike the Style Bible (definitions live in code, registered on import),
// assets live on DISK — so the registry is populated by an explicit, awaited
// `initAssetEngine()` call, not an import side effect. The server calls it at
// startup; scripts call it themselves. Idempotent per process.

import { assetRegistry, createAssetRegistry } from './registry.js';
import { importLocalAssets } from './importer.js';
import { searchRegistry } from './search.js';
import { resolveInRegistry, resolvePathInRegistry } from './resolver.js';
import { validateAssetLibrary } from './validate.js';

export { assetRegistry, createAssetRegistry };
export { importLocalAssets } from './importer.js';
export { searchRegistry } from './search.js';
export { resolveInRegistry, resolvePathInRegistry } from './resolver.js';
export { validateAssetLibrary } from './validate.js';
export { validateAssetRecord, ASSET_CATEGORIES, CATEGORY_ALIASES } from './schema.js';
export { ASSETS_DIR, ASSET_CACHE_PATH, assetAbsolutePath } from './paths.js';
export { slugify } from './importer.js';
export * from './integration.js';

let initPromise = null;

/**
 * Scan + register all local assets into the shared registry. Safe to call
 * repeatedly (first call wins; `{ force: true }` clears and re-imports).
 * @returns {Promise<object>} the import summary.
 */
export function initAssetEngine({ force = false } = {}) {
  if (force) {
    assetRegistry.clear();
    initPromise = null;
  }
  initPromise ||= importLocalAssets({ registry: assetRegistry });
  return initPromise;
}

// ---- singleton-bound conveniences (the shapes consumers actually use) ------

/** Ranked search over the shared registry. */
export function searchAssets(query, opts = {}) {
  return searchRegistry(assetRegistry, query, opts);
}

/** Semantic reference → AssetRecord | null, over the shared registry. */
export function resolveAsset(ref) {
  return resolveInRegistry(assetRegistry, ref);
}

/** Semantic reference → absolute file path | null, over the shared registry. */
export function resolveAssetPath(ref) {
  return resolvePathInRegistry(assetRegistry, ref);
}
