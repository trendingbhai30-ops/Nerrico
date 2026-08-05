// Nerrico Asset Engine — provider (Phase 4C).
//
// The layer between the planner/pipeline and the renderer. Everything the
// renderer receives about an asset comes from here as a RENDER-READY OBJECT:
// a semantic ref resolved to an HTTP src plus timeline fields — never a
// filesystem path. The /api/assets routes are the serving half of this layer;
// provider objects reference assets only by their public URL.
//
// A provided asset is plain JSON (frozen), so it can be persisted, diffed and
// replayed deterministically. Unknown refs return null — content input must
// never crash a render (registry semantics everywhere else).

import { assetRegistry } from './registry.js';
import { resolveInRegistry } from './resolver.js';

// ---------------------------------------------------------------------------
// Timeline contract
// ---------------------------------------------------------------------------
//
// Every provided asset carries these fields. `end: null` means "the natural
// end" — the full video for looping music, the clip's own length for one-shot
// SFX. Future fields ride along untouched (see provideAsset's overrides
// spread) so the shape can grow without breaking existing consumers.

export const TIMELINE_DEFAULTS = Object.freeze({
  start: 0, // seconds into the video
  end: null, // seconds; null = natural end (video end when looping, clip end otherwise)
  volume: 1,
  loop: false,
  fadeIn: 0, // seconds
  fadeOut: 0, // seconds
  enabled: true,
  priority: 0, // higher = more important in the mix (music < motion SFX < content SFX)
});

// The engine's fixed mix — one place, all deterministic. Music sits well under
// the voiceover; motion SFX are accents, planner content SFX slightly louder
// (they carry meaning, not just texture).
export const PROVIDER_MIX = Object.freeze({
  music: Object.freeze({ volume: 0.14, fadeIn: 1, fadeOut: 1.5, loop: true, priority: 10 }),
  motionSfx: Object.freeze({ volume: 0.55, priority: 20 }),
  sceneSfx: Object.freeze({ volume: 0.7, priority: 30 }),
});

// One-shot SFX whose duration the importer couldn't measure still need a
// bounded slot on the timeline.
export const DEFAULT_SFX_SECONDS = 3;

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/** `${baseUrl}/api/assets/<id>/file` — the ONLY address renderers know assets by. */
export function assetUrl(assetOrId, baseUrl = '') {
  const id = typeof assetOrId === 'string' ? assetOrId : assetOrId.id;
  return `${baseUrl}/api/assets/${id}/file`;
}

/**
 * The API-safe view of an AssetRecord: everything a client may know, nothing
 * about the filesystem (no localPath, no hash — those are importer internals).
 */
export function publicAsset(asset, baseUrl = '') {
  if (!asset) return null;
  return {
    id: asset.id,
    name: asset.name,
    displayName: asset.displayName,
    type: asset.type,
    category: asset.category,
    extension: asset.extension,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    license: asset.license,
    author: asset.author,
    tags: [...asset.tags],
    url: assetUrl(asset, baseUrl),
  };
}

const isRecord = (v) => v && typeof v === 'object' && typeof v.id === 'string' && v.category;

/**
 * Semantic ref (or already-resolved record) → render-ready asset object.
 *
 * @param {string|import('./schema.js').AssetRecord} refOrAsset
 * @param {object} [opts]
 *   category  guard: the resolved asset must belong here (else null)
 *   baseUrl   prefix for the src URL ('' = relative, pipeline passes the local server)
 *   registry  override for tests
 *   ...timeline  any TIMELINE_DEFAULTS field, plus future fields (passed through)
 * @returns {object|null} frozen JSON-safe object, or null when unresolvable.
 */
export function provideAsset(refOrAsset, opts = {}) {
  const { category = null, baseUrl = '', registry = assetRegistry, ...timeline } = opts;
  const asset = isRecord(refOrAsset) ? refOrAsset : resolveInRegistry(registry, refOrAsset);
  if (!asset) return null;
  if (category && asset.category !== category) return null;
  return Object.freeze({
    ref: typeof refOrAsset === 'string' ? refOrAsset : asset.id,
    assetId: asset.id,
    category: asset.category,
    type: asset.type,
    src: assetUrl(asset, baseUrl),
    duration: asset.duration,
    ...TIMELINE_DEFAULTS,
    ...timeline, // caller overrides win; unknown future fields ride along
  });
}

/**
 * Music layer entry: full-video looping bed at the engine's music mix.
 * `end: null` + `loop: true` = play (looped) until the video ends.
 */
export function provideMusic(refOrAsset, opts = {}) {
  return provideAsset(refOrAsset, { category: 'music', ...PROVIDER_MIX.music, ...opts });
}

/**
 * SFX layer entry: a one-shot accent. `end` defaults to start + the clip's
 * measured duration (bounded fallback when unmeasured) so the timeline is
 * fully explicit even before the renderer sees it.
 */
export function provideSfx(refOrAsset, opts = {}) {
  const provided = provideAsset(refOrAsset, { category: 'sfx', ...PROVIDER_MIX.sceneSfx, ...opts });
  if (!provided || provided.end !== null) return provided;
  const length = provided.duration ?? DEFAULT_SFX_SECONDS;
  return Object.freeze({ ...provided, end: provided.start + length });
}

/**
 * Icon layer entry: a render-ready icon object. color/size/animation are the
 * declared future surface — they default to null (the composition's choice)
 * and pass through verbatim when set. No UI consumes these yet by design.
 */
export function provideIcon(refOrAsset, opts = {}) {
  const { color = null, size = null, animation = null, ...rest } = opts;
  const provided = provideAsset(refOrAsset, { category: 'icons', ...rest });
  return provided ? Object.freeze({ ...provided, color, size, animation }) : null;
}
