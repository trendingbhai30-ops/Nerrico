# Nerrico Asset Engine — Architecture Reference

> Phase 4A (2026-08-04): the local asset foundation — schema, registry, importer, cache,
> search, resolver, validation, and the integration seams.
> Phase 4B (2026-08-05): asset intelligence — the engine became an intelligent provider:
> motion→SFX semantic events, style→asset preferences, the music selection policy, and
> planner integration (the planner now references semantic ids). Audio/icon layers in the
> actual render are still a later phase; providers/downloading are also still future.

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
| `intelligence.js` | Phase 4B. The decision layer: `MOTION_SFX_EVENTS` (motion kind → semantic sound event), `STYLE_ASSET_PREFERENCES` (style name → music/sfxLevel/overrides/icon prefs), `selectMusic()` (the music policy chain), and the auto-expanding planner vocabularies. Pure data + resolver calls — no filesystem, no randomness, no filenames. |
| `integration.js` | The seams other subsystems call (see below) — Phase 4B routes them through `intelligence.js`. |
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

camelCase semantic refs work too (Phase 4B): `sfx.paperRip` ≡ `sfx.paper.rip` — humps are
split into segments before searching. Registered ids are all-lowercase, so this can never
shadow an exact id.

## Asset intelligence (`intelligence.js`, Phase 4B)

### Motion → SFX semantic events

`MOTION_SFX_EVENTS` maps motion **kinds** to semantic sound refs — one entry per kind
that has a natural sound; everything else (fade, morph, zoom, pan, rotate, orbit) is
silent **by design**:

| Motion kind | Semantic event | Resolves to (current library) |
|---|---|---|
| `slide` | `sfx.whoosh` | sfx.whoosh |
| `whip` | `sfx.swoosh` (fast swoosh) | sfx.swoosh |
| `flash` | `sfx.camera.shutter` | sfx.camera-shutter |
| `paperReveal` | `sfx.paper.tear` | sfx.paper-tear |
| `push` | `sfx.zoom.hit` | sfx.booms |
| `shake` | `sfx.impact` | sfx.booms |
| `focusPull` | `sfx.focus.subtle` | sfx.click-soft |

Presets resolve to their underlying kind through the Motion Registry's public API
(`impactShake` → `shake`, `rackFocus` → `focusPull`, `heroReveal` → `slide`) — the Motion
Engine itself is untouched. This is **semantic mapping only**: nothing plays sounds in a
render yet. `motionSfxEvent(name, style?)` returns `{ motion, kind, event, sfx }`;
`sfxForMotion(name, style?)` resolves it to an actual record.

### Style → asset preferences

`STYLE_ASSET_PREFERENCES` — one declarative entry per Style Bible look, keyed by style
NAME (the Style Bible definitions are untouched). Unknown styles get `default`. Fields:

- `music` — the style's default track as a semantic ref (music policy tier 3).
- `sfxLevel` — `full` (every mapped event plays) | `reduced` (only transition kinds keep
  sound; camera moves go silent) | `minimal` (only explicit overrides play — "almost no
  SFX").
- `motionSfx` — per-kind overrides of the event table (`paper-collage` swaps the paper
  tear for a paper **rip**; `luxury` softens the slide whoosh; `modern-tech` voices the
  normally-silent `morph` with a glitch; `null` forces silence).
- `iconVariant` / `iconTerms` — preferred Tabler variant (outline/filled) and flavor
  terms used to rescue icon searches that found nothing.

Current entries: `paper-collage` (paper rips + documentary lofi), `cinematic` (dark
cinematic, reduced), `documentary` (cinematic ambience, reduced), `ai-documentary` (epic
synth + glitch morphs, filled icons), `history` (emotional calm + paper rips, reduced),
`finance` (corporate upbeat), `modern-tech` (tech synth + glitches, filled icons),
`luxury` (premium calm + soft whooshes, reduced), `minimal` (quiet music, minimal SFX).

### Music selection policy

`selectMusic({ user, project, style, registry? })` — priority:

```
user choice → project setting → style default → engine fallback
```

Each tier's value may be `'auto'`/unset (fall through), `'none'` (a real decision —
silence), `'custom:<ref>'` (reserved future shape for user uploads; selects
deterministically, resolves to no local asset yet), or a semantic music category
(`'music.epic'`, bare `'epic'` works too). Unresolvable categories degrade to the next
tier with a note in the returned `trail` — never a crash. Resolution is
category-guarded: a music request can never come back with an icon. The result
(`{ policy, source, ref, assetId, asset, trail }`) is JSON-serializable minus `asset`.

Wired in production: `POST /api/projects` accepts an optional `music` setting
(`'auto'` default, validated), the store persists/backfills it, and `stepScenes` runs
the policy and stores `musicPlan: { policy, source, ref, assetId }` on the project —
semantic data only, no paths. `GET /api/options` exposes
`music: { policies, categories }`; the categories are derived from the registered
tracks' tags, so the vocabulary **expands automatically** as the library grows.

### Planner integration

`shotsPrompt` now offers an optional per-shot `"sfx"` field whose vocabulary comes from
`plannerSfxVocabulary(style)` — registry-derived semantic ids only (never filenames),
content accents only (transition/riser sounds are excluded because the motion→SFX
mapping owns those), and empty for `minimal`-level styles (the field then never enters
the prompt). `validateShots` resolves planner-emitted refs through the Asset Engine and
stores the canonical registry id; unresolvable or wrong-category refs are stripped to
`null`, mirroring how motion names are checked against the Motion Registry.

## Integration seams (`integration.js`)

Phase 4A shipped these as thin generic lookups; Phase 4B routed them through the
intelligence layer. **Signatures are unchanged** — the style parameters are optional
extensions, so 4A callers behave identically:

- `requestAsset({ id?, query?, category?, type? })` — generic entry point: id first, then ranked search.
- `sfxForMotion(kindOrPreset, style?)` — the semantic event table with the style's overrides and sfxLevel applied; names unknown to the Motion Engine fall back to the Phase 4A ranked search.
- `assetForStyle(style, req)` — style-aware: a bare `{category:'music'}` request returns the style's default track; icon searches get flavor-term rescue and the preferred variant (outline/filled) when a sibling exists.
- `assetForPlanner(ref)` / `plannerAssetVocabulary(style?)` — planner seams; the vocabulary keeps its 4A shape and adds `musicCategories`, `sfxEvents`, and `plannerSfx` (all registry-derived, auto-expanding).
- `assetPathForRender(ref)` — what pipeline.js will hand to Remotion when audio/icon layers arrive.

In production, the seams now feed the scene planner (`shotsPrompt` sfx vocabulary,
`validateShots` resolution) and the pipeline's music plan; the render itself still
consumes no audio/icons (later phase).

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
- `node scripts/test-assets-intelligence.js` — 67 Phase 4B checks: semantic resolution
  of the id vocabulary, resolver fallback, style-aware selection, motion→SFX mapping
  (defaults, overrides, levels), the full music policy chain (tiers, auto/none/custom,
  degradation, engine fallback, empty library), planner integration (prompt vocabulary,
  `validateShots` resolution, no filenames anywhere), and duplicate safety (idempotent
  init, forced re-import, frozen tables).
- `node scripts/demo-assets.js` — walks every subsystem against the real library and
  prints a human-readable tour (import summary, registry stats, ranked searches,
  semantic resolutions, integration seams, health report).

Run both smoke tests after any `src/assets/` change.

## What later phases add

- **Providers/downloading**: fetch missing assets from free providers into the library
  (the importer/registry need no changes — new files are just imported).
- **Render integration**: actual background-music and SFX audio layers (consuming
  `musicPlan` + per-shot `sfx` + the motion events) and SVG icon layers in Remotion,
  via `assetPathForRender`.
