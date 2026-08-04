# Nerrico Asset Engine — Architecture Reference

> Phase 4A (2026-08-04). The local asset foundation: schema, registry, importer, cache,
> search, resolver, validation, and the integration seams other subsystems will call.
> Phase 4B (providers/downloading) and 4C (asset intelligence) build on top of this —
> nothing in 4A changes pipeline behaviour yet.

## What it is

The Asset Engine is the single source of truth for every local media asset the pipeline
may use: background **music**, **sound effects**, and **icons**. It follows the same
design as the Motion Registry and the Style Bible:

- **Registration is strict** — duplicate ids throw, invalid records throw (importer bugs
  must be loud).
- **Lookups are safe** — unknown ids/queries return `null` (content input must never
  crash a render).
- **Records are deep-frozen** — per-request code can share them without defensive copies.

Consumers never touch the filesystem or build paths. They ask for a **semantic id**
(`sfx.paper.rip`, `music.documentary.calm`, `icon.money`) and get an `AssetRecord` or an
absolute file path back.

## On-disk layout

```
Nerrico/
├── assets/                      ← the local asset library (project-level, beside backend/)
│   ├── music/                   ← 6 background tracks (.webm) + tags.json sidecar
│   ├── sfx/                     ← 26 sound effects (.mp3) + tags.json sidecar
│   └── icons/                   ← Tabler Icons (MIT): outline/ + filled/ (~6,200 .svg),
│                                   aliases.json, LICENSE
└── backend/
    ├── data/asset-cache.json    ← importer metadata cache (gitignored, per-machine)
    └── src/assets/              ← the engine (see below)
```

The original asset folders are the library — files are read in place, never moved or
renamed. Dropping a supported file into a category folder is all it takes to add an
asset; the next import picks it up.

## Module map (`backend/src/assets/`)

| File | Responsibility |
|---|---|
| `schema.js` | THE definition of an `AssetRecord` + the category table (`ASSET_CATEGORIES`). Adding a future category (fonts, textures) is one entry here — importer/registry/search/resolver need no changes. `validateAssetRecord` throws precisely on the first violation. |
| `registry.js` | `createAssetRegistry()` factory + the `assetRegistry` singleton. Validate → freeze → store; `get`/`has`/`list`/`listIds`/`stats`/`clear`. |
| `paths.js` | `ASSETS_DIR`, `ASSET_CACHE_PATH`, and `assetAbsolutePath()` — the ONE bridge from records to real files. |
| `cache.js` | Persisted importer cache keyed by localPath. A file whose size+mtime are unchanged reuses its expensive metadata (hash, duration, dimensions) wholesale. Corrupted/version-mismatched cache → rebuild + warning, never fatal. |
| `importer.js` | `importLocalAssets()`: scans the category folders, strips download-site junk from names (`slugify`), sha1-hashes content, reads audio durations (`@remotion/media-parser`), parses SVG dimensions + Tabler's `tags:`/`category:` comment + `aliases.json`, merges optional `tags.json` curation sidecars, skips duplicate content within a category, ignores (and counts) unsupported files. Deterministic: sorted scan order, stable id collision suffixes. |
| `search.js` | `searchRegistry()`: deterministic ranked search. Multi-term queries are AND-semantics; each term sums its best score per field (exact > prefix > substring; name > tags > keywords > id); ties break on id so ordering is stable — a hard requirement for the resolver. |
| `resolver.js` | `resolveInRegistry()`: exact id → semantic lookup (first segment names a category via `CATEGORY_ALIASES`, rest are search terms) → relaxed retries dropping the most-generic leading term → whole-string search across categories → `null`. `resolvePathInRegistry()` goes straight to an absolute path. |
| `validate.js` | `validateAssetLibrary()`: post-import health check over registry + disk — errors (missing files, schema violations, stale metadata), warnings (duplicate content, missing durations), info (ignored files). |
| `integration.js` | The seams other subsystems call (see below). |
| `index.js` | Public API. `initAssetEngine()` populates the singleton registry (explicit + awaited, NOT an import side effect; idempotent per process, `{ force: true }` re-imports). Everything outside `assets/` imports from here only. |

## The AssetRecord (schema.js)

```js
{
  id: 'sfx.paper-ripping',        // semantic dotted slug — the ONLY handle consumers use
  name: 'paper-ripping',
  displayName: 'Paper Ripping',
  type: 'audio',                  // 'audio' | 'image', must match the category
  category: 'sfx',                // 'music' | 'sfx' | 'icons'
  localPath: 'sfx/paper-ripping (1).mp3',  // relative, forward slashes, no '..'
  extension: '.mp3',
  size: 12345,
  duration: 0.731,                // seconds (audio) or null
  width: null, height: null,      // pixels (images) or null
  license: 'unknown',             // icons default to 'MIT (Tabler Icons)'
  author: '',
  tags: ['paper'],                // curated/parsed — high search weight
  keywords: ['paper', 'ripping'], // derived name tokens + aliases — lower weight
  status: 'active',
  createdAt: '…', updatedAt: '…', // first import / last content change (cache-preserved)
  hash: '…sha1…',                 // content hash — duplicate/change detection
  metadata: { variant: 'outline', tablerCategory: 'E-commerce' }  // category extras
}
```

Icon ids encode the variant: `icon.coin` (outline is the default, no suffix) vs
`icon.coin.filled`.

## Semantic resolution

`resolveAsset('music.documentary.calm')`:

1. Exact id? No.
2. First segment `music` is a category (aliases: `sound` → sfx, `icon`/`icons` → icons).
   Search `documentary calm` within music — hit? Take the top-ranked one.
3. No hit → drop the most-generic **leading** term and retry (`calm`). Leading segments
   are broad descriptors; the last segment is the specific ask.
4. Still nothing → whole-string search across all categories.
5. Nothing → `null`. Never throws, mirroring registry semantics everywhere else.

## Integration seams (`integration.js`)

Phase 4A ships **interfaces only** — thin, deterministic, and deliberately unintelligent
so future smarts land in exactly one place per subsystem without touching callers:

- `requestAsset({ id?, query?, category?, type? })` — generic entry point: id first, then ranked search.
- `sfxForMotion(kindOrPreset)` — Motion Engine seam ("whip" → whoosh, "paperReveal" → paper rip). The curated kind→sound mapping table is Phase 4C.
- `assetForStyle(style, req)` — Style Bible seam; ignores the style until Phase 4C.
- `assetForPlanner(ref)` / `plannerAssetVocabulary()` — planner seams; the vocabulary mirrors the Motion Engine's registry-sourced legends (music/sfx enumerable, icons summarized by count + tag pool).
- `assetPathForRender(ref)` — what pipeline.js will hand to Remotion when audio/icon layers arrive.

**Nothing calls these in production yet** — the Motion Engine, Style Bible, planner, and
render pipeline are untouched in Phase 4A.

## Server startup

`src/server.js` calls `initAssetEngine()` after the app starts listening — non-blocking,
and a failure is logged but never takes the server down. Warm-cache import of the full
library (~6,200 assets) takes well under a second.

## Import cache

`backend/data/asset-cache.json` (gitignored). Only the EXPENSIVE metadata is cached
(hash, duration, dimensions, timestamps), keyed by localPath and invalidated by
size/mtime change. Cheap metadata (names, tags, keywords) is re-derived every import so
sidecar edits take effect without touching the cache. `createdAt` survives content
changes; `updatedAt` moves.

## Curation sidecars (optional, never required)

- `assets/<category>/tags.json` — `{ "<filename>": { name?, displayName?, tags?, keywords?, author?, license? } }`
- `assets/icons/aliases.json` — Tabler's alias map; alias names become searchable keywords.
- Tabler SVGs' leading `<!-- tags: […] category: … -->` comment is parsed into the record.

## Testing

- `node scripts/test-assets.js` — 71 pure-Node checks: a synthetic fixture tree (built
  fresh under gitignored `data/`) exercises importer, registry, schema
  accept/reject, cache (warm reuse, change detection, corruption recovery), search
  ranking/filters/determinism, resolver fallbacks, duplicate prevention, and library
  validation; then the REAL library is imported and sanity-checked end to end.
- `node scripts/demo-assets.js` — walks every subsystem against the real library and
  prints a human-readable tour (import summary, registry stats, ranked searches,
  semantic resolutions, integration seams, health report).

Run the smoke test after any `src/assets/` change.

## What later phases add

- **Phase 4B — providers/downloading**: fetch missing assets from free providers into
  the library (the importer/registry need no changes — new files are just imported).
- **Phase 4C — asset intelligence**: style-aware selection (`assetForStyle` honors the
  Style Bible definition), a curated motion-kind→SFX mapping, planner prompt legends
  from `plannerAssetVocabulary()`, and actual audio/icon layers in the render pipeline.
