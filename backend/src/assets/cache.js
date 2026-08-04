// Nerrico Asset Engine — importer cache.
//
// Persists the EXPENSIVE-to-derive metadata per file (content hash, audio
// duration, image dimensions, first-seen/last-changed timestamps), keyed by
// localPath. A file whose size+mtime are unchanged reuses its cached entry
// wholesale; anything else is recomputed. Cheap metadata (names, tags,
// keywords) is re-derived on every import so sidecar edits take effect
// without cache invalidation.
//
// A corrupted or version-mismatched cache is never fatal — the importer
// starts fresh and reports a warning.

import fs from 'node:fs';
import path from 'node:path';

const CACHE_VERSION = 1;

/**
 * @typedef {object} CacheEntry
 * @property {number} size
 * @property {number} mtimeMs
 * @property {string} hash
 * @property {number|null} duration
 * @property {number|null} width
 * @property {number|null} height
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {string} cachePath
 * @returns {{entries: Record<string, CacheEntry>, warning: string|null}}
 */
export function loadAssetCache(cachePath) {
  if (!fs.existsSync(cachePath)) return { entries: {}, warning: null };
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (raw.version !== CACHE_VERSION || !raw.entries || typeof raw.entries !== 'object') {
      return { entries: {}, warning: `asset cache version mismatch — rebuilding (${cachePath})` };
    }
    return { entries: raw.entries, warning: null };
  } catch (e) {
    return { entries: {}, warning: `asset cache corrupted — rebuilding (${e.message})` };
  }
}

/** @param {string} cachePath @param {Record<string, CacheEntry>} entries */
export function saveAssetCache(cachePath, entries) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  // Stable key order keeps the file diff-friendly and imports deterministic.
  const sorted = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
  fs.writeFileSync(cachePath, JSON.stringify({ version: CACHE_VERSION, entries: sorted }, null, 1));
}

/** True when a cache entry still describes this exact file on disk. */
export function cacheEntryFresh(entry, stat) {
  return !!entry && entry.size === stat.size && entry.mtimeMs === stat.mtimeMs;
}
