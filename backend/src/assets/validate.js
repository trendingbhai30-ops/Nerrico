// Nerrico Asset Engine — library validation.
//
// Post-import health check over registry + disk. Errors are problems that
// would break a consumer (missing files, schema violations, id collisions);
// warnings are hygiene issues (duplicate content, unknown licenses en masse);
// info is context (unsupported files that were ignored).

import fs from 'node:fs';
import { validateAssetRecord } from './schema.js';
import { assetAbsolutePath, ASSETS_DIR } from './paths.js';

/**
 * @param {object} [opts]
 * @param {ReturnType<import('./registry.js').createAssetRegistry>} opts.registry
 * @param {string} [opts.rootDir]
 * @param {object} [opts.importSummary]  Optional summary from importLocalAssets.
 * @returns {{ok: boolean, errors: string[], warnings: string[], info: string[]}}
 */
export function validateAssetLibrary({ registry, rootDir = ASSETS_DIR, importSummary = null }) {
  const errors = [];
  const warnings = [];
  const info = [];
  const seenIds = new Set();
  const seenHashes = new Map();

  for (const asset of registry.list()) {
    // Schema (registration already enforces this; re-checked so hand-built or
    // future deserialized records are caught too).
    try {
      validateAssetRecord(asset);
    } catch (e) {
      errors.push(e.message);
      continue;
    }

    if (seenIds.has(asset.id)) errors.push(`duplicate asset id "${asset.id}"`);
    seenIds.add(asset.id);

    const absPath = assetAbsolutePath(asset, rootDir);
    if (!fs.existsSync(absPath)) {
      errors.push(`missing file for "${asset.id}": ${asset.localPath}`);
    } else {
      const stat = fs.statSync(absPath);
      if (stat.size !== asset.size) {
        errors.push(`stale metadata for "${asset.id}": size on disk ${stat.size} ≠ recorded ${asset.size} (re-import needed)`);
      }
    }

    if (asset.type === 'audio' && asset.duration === null) {
      warnings.push(`no duration for audio asset "${asset.id}"`);
    }

    const hashKey = `${asset.category}:${asset.hash}`;
    if (seenHashes.has(hashKey)) {
      warnings.push(`"${asset.id}" has identical content to "${seenHashes.get(hashKey)}"`);
    }
    seenHashes.set(hashKey, asset.id);
  }

  if (registry.size() === 0) {
    warnings.push('registry is empty — did the importer run?');
  }
  if (importSummary) {
    for (const w of importSummary.warnings) warnings.push(w);
    for (const d of importSummary.duplicates) warnings.push(`duplicate content skipped at import: ${d}`);
    for (const u of importSummary.unsupported) info.push(`unsupported file ignored: ${u}`);
  }

  return { ok: errors.length === 0, errors, warnings, info };
}
