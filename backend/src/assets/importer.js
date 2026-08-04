// Nerrico Asset Engine — local asset importer.
//
// Turns the on-disk assets/ tree into registered AssetRecords. Nothing is
// hardcoded: dropping a supported file into a category folder is all it takes
// to add an asset. Unsupported files are ignored (and counted), duplicate
// CONTENT within a category is skipped with a warning, and a persisted cache
// (cache.js) means unchanged files are never re-hashed or re-parsed.
//
// Optional curation sidecars (never required):
//   <category dir>/tags.json     { "<filename>": { name?, displayName?, tags?,
//                                  keywords?, author?, license? } }
//   assets/icons/aliases.json    Tabler's alias map — alias names become keywords.
// Tabler SVGs also carry `tags:`/`category:` in their leading comment; the
// importer parses those into the record.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseMedia } from '@remotion/media-parser';
import { nodeReader } from '@remotion/media-parser/node';
import { createLogger } from '../utils/logger.js';
import { ASSET_CATEGORIES, SIDECAR_FILES } from './schema.js';
import { ASSETS_DIR, ASSET_CACHE_PATH, assetAbsolutePath } from './paths.js';
import { assetRegistry } from './registry.js';
import { loadAssetCache, saveAssetCache, cacheEntryFresh } from './cache.js';

const log = createLogger('assets');

// Junk tokens that download sites append to filenames — stripped from slugs.
const NAME_JUNK = [/vidssave\.com/gi, /\b\d+\s?kbps\b/gi, /\bonline-audio-converter\b/gi, /\(\d+\)/g, /\[ncs fanmade\]/gi];

/** "vidssave.com Foo Bar 256kbps" → "foo-bar" */
export function slugify(base) {
  let s = String(base).toLowerCase();
  for (const junk of NAME_JUNK) s = s.replace(junk, ' ');
  return s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function readJsonSidecar(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    log.warn(`ignoring unreadable sidecar ${file}: ${e.message}`);
    return null;
  }
}

/** Tabler SVGs open with `<!-- tags: [a, b] category: X ... -->`. */
function parseTablerComment(svgText) {
  const comment = svgText.match(/^\s*<!--([\s\S]*?)-->/);
  if (!comment) return {};
  const tags = comment[1].match(/tags:\s*\[([^\]]*)\]/);
  const category = comment[1].match(/category:\s*(.+)/);
  return {
    tags: tags ? tags[1].split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
    tablerCategory: category ? category[1].trim().replace(/^"|"$/g, '') : null,
  };
}

function parseSvgDimensions(svgText) {
  const attr = (name) => {
    const m = svgText.match(new RegExp(`<svg[^>]*?\\s${name}="([\\d.]+)"`, 's'));
    return m ? Number(m[1]) : null;
  };
  let width = attr('width');
  let height = attr('height');
  if (width === null || height === null) {
    const vb = svgText.match(/<svg[^>]*?\sviewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/s);
    if (vb) {
      width ??= Number(vb[1]);
      height ??= Number(vb[2]);
    }
  }
  return { width, height };
}

async function audioDuration(absPath) {
  try {
    const { durationInSeconds } = await parseMedia({
      src: absPath,
      reader: nodeReader,
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    return typeof durationInSeconds === 'number' ? Math.round(durationInSeconds * 1000) / 1000 : null;
  } catch (e) {
    log.warn(`could not read duration of ${path.basename(absPath)}: ${e.message}`);
    return null;
  }
}

/** Discover supported files in a category folder. Deterministic (sorted). */
function discoverFiles(catDir, category, summary) {
  const found = [];
  const walk = (dir, variant) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (category.recursive) walk(full, entry.name);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (category.extensions.includes(ext)) {
        found.push({ absPath: full, ext, variant });
      } else if (!SIDECAR_FILES.has(entry.name.toLowerCase())) {
        summary.unsupported.push(path.relative(path.dirname(catDir), full).split(path.sep).join('/'));
      }
    }
  };
  walk(catDir, null);
  return found;
}

/** Reverse Tabler's alias map: canonical name → [aliases]. */
function aliasIndex(aliasesJson) {
  const index = new Map();
  if (!aliasesJson) return index;
  for (const variantMap of Object.values(aliasesJson)) {
    if (!variantMap || typeof variantMap !== 'object') continue;
    for (const [alias, canonical] of Object.entries(variantMap)) {
      if (!index.has(canonical)) index.set(canonical, []);
      index.get(canonical).push(alias);
    }
  }
  return index;
}

/**
 * Scan the assets tree, (re)build metadata and register everything.
 * Idempotent per registry: `registry.clear()` first when re-importing.
 *
 * @param {object} [opts]
 * @param {import('./registry.js').assetRegistry} [opts.registry]
 * @param {string} [opts.rootDir]   assets root (default Nerrico/assets)
 * @param {string} [opts.cachePath] cache file (default backend/data/asset-cache.json)
 * @returns {Promise<{total:number, byCategory:Record<string,number>, fromCache:number,
 *   computed:number, unsupported:string[], duplicates:string[], warnings:string[]}>}
 */
export async function importLocalAssets({ registry = assetRegistry, rootDir = ASSETS_DIR, cachePath = ASSET_CACHE_PATH } = {}) {
  const summary = { total: 0, byCategory: {}, fromCache: 0, computed: 0, unsupported: [], duplicates: [], warnings: [] };
  const { entries: cache, warning: cacheWarning } = loadAssetCache(cachePath);
  if (cacheWarning) {
    log.warn(cacheWarning);
    summary.warnings.push(cacheWarning);
  }
  const nextCache = {};
  const seenHashes = new Map(); // `${category}:${hash}` → id (content-duplicate detection)

  for (const [categoryKey, category] of Object.entries(ASSET_CATEGORIES)) {
    const catDir = path.join(rootDir, category.dir);
    const files = discoverFiles(catDir, category, summary);
    const sidecar = readJsonSidecar(path.join(catDir, 'tags.json')) || {};
    const aliases = categoryKey === 'icons' ? aliasIndex(readJsonSidecar(path.join(catDir, 'aliases.json'))) : new Map();
    let count = 0;

    for (const { absPath, ext, variant } of files) {
      const relPath = path.relative(rootDir, absPath).split(path.sep).join('/');
      const stat = fs.statSync(absPath);
      const fileName = path.basename(absPath);
      const baseName = path.basename(absPath, path.extname(absPath));
      const curated = sidecar[fileName] || {};

      // --- expensive metadata: cache hit or recompute -----------------------
      let entry = cache[relPath];
      let svgText = null;
      if (cacheEntryFresh(entry, stat)) {
        summary.fromCache++;
      } else {
        const now = new Date().toISOString();
        const buffer = fs.readFileSync(absPath);
        svgText = ext === '.svg' ? buffer.toString('utf8') : null;
        entry = {
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          hash: sha1(buffer),
          duration: category.type === 'audio' ? await audioDuration(absPath) : null,
          ...(svgText ? parseSvgDimensions(svgText) : { width: null, height: null }),
          createdAt: cache[relPath]?.createdAt || now,
          updatedAt: now,
        };
        summary.computed++;
      }
      nextCache[relPath] = entry;

      // --- duplicate content within a category ------------------------------
      const hashKey = `${categoryKey}:${entry.hash}`;
      if (seenHashes.has(hashKey)) {
        summary.duplicates.push(`${relPath} (same content as ${seenHashes.get(hashKey)})`);
        continue;
      }

      // --- cheap metadata: derived fresh every import -----------------------
      const slug = curated.name || slugify(baseName) || slugify(fileName) || 'asset';
      const isDefaultVariant = !variant || variant === 'outline';
      let id = `${category.idPrefix}.${slug}${isDefaultVariant ? '' : `.${slugify(variant)}`}`;
      if (registry.has(id)) {
        // same-name collision after slug cleanup — deterministic numeric suffix
        let n = 2;
        while (registry.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      const tablerMeta = ext === '.svg' ? parseTablerComment(svgText ?? fs.readFileSync(absPath, 'utf8')) : {};
      const keywords = [...new Set([...slug.split('-'), ...(aliases.get(baseName) || []), ...(curated.keywords || [])])].filter(Boolean);
      const tags = [...new Set([...(tablerMeta.tags || []), ...(tablerMeta.tablerCategory ? [tablerMeta.tablerCategory.toLowerCase()] : []), ...(curated.tags || [])])];

      registry.register({
        id,
        name: slug,
        displayName: curated.displayName || titleCase(slug),
        type: category.type,
        category: categoryKey,
        localPath: relPath,
        extension: ext,
        size: stat.size,
        duration: entry.duration,
        width: entry.width,
        height: entry.height,
        license: curated.license || (categoryKey === 'icons' ? 'MIT (Tabler Icons)' : 'unknown'),
        author: curated.author || (categoryKey === 'icons' ? 'Tabler' : ''),
        tags,
        keywords,
        status: 'active',
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        hash: entry.hash,
        metadata: {
          ...(variant ? { variant } : {}),
          ...(tablerMeta.tablerCategory ? { tablerCategory: tablerMeta.tablerCategory } : {}),
        },
      });
      seenHashes.set(hashKey, id);
      count++;
    }
    summary.byCategory[categoryKey] = count;
    summary.total += count;
  }

  saveAssetCache(cachePath, nextCache);
  log.info(
    `imported ${summary.total} assets (${Object.entries(summary.byCategory).map(([k, v]) => `${k}: ${v}`).join(', ')}) — ` +
      `${summary.fromCache} cached, ${summary.computed} computed, ${summary.duplicates.length} duplicates skipped, ${summary.unsupported.length} unsupported ignored`,
  );
  return summary;
}

export { assetAbsolutePath };
