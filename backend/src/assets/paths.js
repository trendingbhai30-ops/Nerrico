// Nerrico Asset Engine — filesystem locations.
//
// The assets root lives at the repo root (Nerrico/assets/), beside backend/.
// The metadata cache lives under backend/data/ (per-machine, gitignored,
// like project data).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Nerrico/assets — the standardized local asset root (music/, sfx/, icons/). */
export const ASSETS_DIR = path.join(__dirname, '..', '..', '..', 'assets');

/** Persisted importer cache (hashes, durations, dimensions, timestamps). */
export const ASSET_CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'asset-cache.json');

/**
 * Absolute path for an asset (or a raw localPath). THE bridge from semantic
 * ids to real files — consumers never build asset paths themselves.
 * @param {import('./schema.js').AssetRecord|string} assetOrLocalPath
 * @param {string} [rootDir]
 */
export function assetAbsolutePath(assetOrLocalPath, rootDir = ASSETS_DIR) {
  const rel = typeof assetOrLocalPath === 'string' ? assetOrLocalPath : assetOrLocalPath.localPath;
  return path.join(rootDir, ...rel.split('/'));
}
