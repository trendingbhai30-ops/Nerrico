// Nerrico Asset Engine — schema.
//
// The single definition of WHAT an asset is (the record shape every consumer
// sees) and WHICH categories exist. Adding a future category (fonts,
// textures, ...) is one entry in ASSET_CATEGORIES — importer, registry,
// search and resolver all read this table and need no changes.

/**
 * @typedef {object} AssetRecord
 * @property {string} id           Semantic id, e.g. "sfx.paper-ripping", "icon.coin.filled".
 * @property {string} name         Clean slug derived from the filename (or sidecar override).
 * @property {string} displayName  Human-readable name.
 * @property {'audio'|'image'} type
 * @property {string} category     Key of ASSET_CATEGORIES, e.g. "music" | "sfx" | "icons".
 * @property {string} localPath    Path relative to the assets root, forward slashes.
 * @property {string} extension    Lowercase, with dot, e.g. ".mp3".
 * @property {number} size         Bytes.
 * @property {number|null} duration  Seconds (audio), null when unknown/not applicable.
 * @property {number|null} width     Pixels/units (images), null when unknown.
 * @property {number|null} height
 * @property {string} license     e.g. "MIT (Tabler Icons)"; "unknown" when unrecorded.
 * @property {string} author      Empty string when unknown.
 * @property {string[]} tags      Curated/parsed semantic tags (search: high weight).
 * @property {string[]} keywords  Derived name tokens + aliases (search: lower weight).
 * @property {'active'} status
 * @property {string} createdAt   ISO — first time this file was imported.
 * @property {string} updatedAt   ISO — last time the file content changed.
 * @property {string} hash        sha1 of file content (duplicate/change detection).
 * @property {object} metadata    Category-specific extras (icon variant, tabler category, ...).
 */

// Every audio container the render pipeline / Chromium can play.
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.flac'];

/**
 * The category table — the ONLY place a category is defined.
 *   dir        folder under the assets root that the importer scans
 *   type       record type for every asset in the category
 *   idPrefix   first segment of generated ids
 *   extensions supported files; everything else in the folder is ignored
 *   recursive  scan subfolders (subfolder name becomes metadata.variant)
 */
export const ASSET_CATEGORIES = {
  music: { dir: 'music', type: 'audio', idPrefix: 'music', extensions: AUDIO_EXTENSIONS, recursive: false },
  sfx: { dir: 'sfx', type: 'audio', idPrefix: 'sfx', extensions: AUDIO_EXTENSIONS, recursive: false },
  icons: { dir: 'icons', type: 'image', idPrefix: 'icon', extensions: ['.svg'], recursive: true },
  // Future (intentionally postponed): fonts: {...}, textures: {...}
};

// Resolver aliases: first segment of a semantic id → category key.
export const CATEGORY_ALIASES = {
  music: 'music',
  sfx: 'sfx',
  sound: 'sfx',
  icon: 'icons',
  icons: 'icons',
};

// Sidecar/bookkeeping files that legitimately live inside asset folders and
// must not be reported as "unsupported".
export const SIDECAR_FILES = new Set(['tags.json', 'aliases.json', 'license', 'readme.md', '.gitkeep']);

const isStr = (v) => typeof v === 'string';
const isStrArray = (v) => Array.isArray(v) && v.every(isStr);
const numOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

/**
 * Validate an AssetRecord. Throws with a precise message on the first
 * violation (registration is a programmer/importer error path, mirroring the
 * Style Bible's validateStyleDefinition).
 * @param {AssetRecord} a
 */
export function validateAssetRecord(a) {
  const fail = (msg) => {
    throw new Error(`Asset Engine: invalid asset${a && a.id ? ` "${a.id}"` : ''} — ${msg}`);
  };
  if (!a || typeof a !== 'object') fail('record is not an object');
  if (!isStr(a.id) || !/^[a-z0-9][a-z0-9.-]*$/.test(a.id)) fail('id must be a lowercase dotted slug');
  if (!isStr(a.name) || !a.name) fail('name is required');
  if (!isStr(a.displayName) || !a.displayName) fail('displayName is required');
  if (a.type !== 'audio' && a.type !== 'image') fail(`type "${a.type}" is not audio|image`);
  if (!ASSET_CATEGORIES[a.category]) fail(`unknown category "${a.category}"`);
  if (ASSET_CATEGORIES[a.category].type !== a.type) fail(`type "${a.type}" does not match category "${a.category}"`);
  if (!isStr(a.localPath) || !a.localPath || a.localPath.includes('\\') || a.localPath.includes('..')) {
    fail('localPath must be a forward-slash relative path without ".."');
  }
  if (!isStr(a.extension) || !a.extension.startsWith('.')) fail('extension must start with "."');
  if (!ASSET_CATEGORIES[a.category].extensions.includes(a.extension)) {
    fail(`extension "${a.extension}" unsupported for category "${a.category}"`);
  }
  if (typeof a.size !== 'number' || a.size < 0) fail('size must be a non-negative number');
  if (!numOrNull(a.duration)) fail('duration must be a number or null');
  if (!numOrNull(a.width) || !numOrNull(a.height)) fail('width/height must be numbers or null');
  if (!isStr(a.license) || !a.license) fail('license is required ("unknown" is acceptable)');
  if (!isStr(a.author)) fail('author must be a string');
  if (!isStrArray(a.tags)) fail('tags must be a string array');
  if (!isStrArray(a.keywords)) fail('keywords must be a string array');
  if (a.status !== 'active') fail(`status "${a.status}" is not "active"`);
  if (!isStr(a.createdAt) || !isStr(a.updatedAt)) fail('createdAt/updatedAt must be ISO strings');
  if (!isStr(a.hash) || !/^[a-f0-9]{40}$/.test(a.hash)) fail('hash must be a 40-char sha1 hex');
  if (!a.metadata || typeof a.metadata !== 'object') fail('metadata must be an object');
  return a;
}
