// Nerrico Asset Engine — asset intelligence (Phase 4B).
//
// The decision layer that turns the passive Phase 4A library into an
// intelligent provider. Three mapping tables — motion→SFX events, style→asset
// preferences, and the music selection policy — all pure data, all resolved
// through the Phase 4A resolver at request time. Nothing here touches the
// filesystem, nothing is random, nothing names a file: every value is a
// SEMANTIC reference ("sfx.paper.rip"), so swapping library files changes
// what plays without touching a line of this module.
//
// Deliberately NOT here: audio layers in renders (a later phase). This module
// only decides WHICH asset a subsystem should use.

import { motionRegistry } from '../../remotion/motion/index.js';
import { assetRegistry } from './registry.js';
import { resolveInRegistry } from './resolver.js';
import { searchRegistry } from './search.js';

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(obj);
}

/**
 * Category-guarded resolution: a semantic ref may be fully qualified
 * ("music.epic") or bare ("epic") — either way the result MUST belong to the
 * requested category (a music request can never come back with an icon).
 */
export function resolveInCategory(registry, ref, category) {
  if (!ref || typeof ref !== 'string') return null;
  const resolved = resolveInRegistry(registry, ref);
  if (resolved && resolved.category === category) return resolved;
  const hits = searchRegistry(registry, ref, { category, limit: 1 });
  return hits.length ? hits[0].asset : null;
}

// ---------------------------------------------------------------------------
// 1. Motion → SFX semantic events
// ---------------------------------------------------------------------------
//
// One entry per motion KIND that has a natural sound. Kinds without an entry
// (fade, morph, zoom, pan, rotate, orbit) are silent BY DESIGN — a camera
// drift has no foley. Presets resolve to their underlying kind through the
// Motion Registry's public API (read-only; the Motion Engine is untouched).
// Values are semantic refs, resolved against the library at request time.

export const MOTION_SFX_EVENTS = deepFreeze({
  slide: { event: 'slide', sfx: 'sfx.whoosh', description: 'lateral slide — air whoosh' },
  whip: { event: 'whip', sfx: 'sfx.swoosh', description: 'whip cut — fast swoosh' },
  flash: { event: 'flash', sfx: 'sfx.camera.shutter', description: 'white flash — camera shutter' },
  paperReveal: { event: 'paperReveal', sfx: 'sfx.paper.tear', description: 'paper reveal — paper tear' },
  push: { event: 'push', sfx: 'sfx.zoom.hit', description: 'dolly push — zoom hit' },
  shake: { event: 'shake', sfx: 'sfx.impact', description: 'camera shake — impact' },
  focusPull: { event: 'focusPull', sfx: 'sfx.focus.subtle', description: 'focus pull — subtle focus tick' },
});

/** "paperReveal"/"impactShake" → the motion KIND it plays ("paperReveal"/"shake"), or null. */
export function motionKindOf(kindOrPreset) {
  const name = String(kindOrPreset || '');
  if (!name) return null;
  for (const category of ['transition', 'camera', 'effect']) {
    if (motionRegistry.has(category, name)) return name;
  }
  const preset = motionRegistry.get('preset', name);
  return preset?.config?.kind || null;
}

/**
 * The semantic sound event for a motion kind or preset — style-aware.
 *
 * Style gating (from the style's sfxLevel):
 *   'full'    every mapped event plays.
 *   'reduced' only TRANSITION kinds keep their sound (camera moves go silent).
 *   'minimal' only events the style explicitly overrides play — "almost no SFX".
 * A style's motionSfx override always wins, including `null` (= force silent)
 * and sounds for kinds that are silent by default.
 *
 * @returns {{ motion: string, kind: string, event: string, sfx: string|null }|null}
 *   null when the name is unknown to the Motion Engine.
 */
export function motionSfxEvent(kindOrPreset, styleOrName = null) {
  const kind = motionKindOf(kindOrPreset);
  if (!kind) return null;
  const prefs = stylePreferencesFor(styleOrName);
  const base = MOTION_SFX_EVENTS[kind] || null;

  let sfx;
  if (Object.hasOwn(prefs.motionSfx, kind)) {
    sfx = prefs.motionSfx[kind]; // explicit style override (may be null = silent)
  } else if (prefs.sfxLevel === 'minimal') {
    sfx = null;
  } else if (prefs.sfxLevel === 'reduced' && !motionRegistry.has('transition', kind)) {
    sfx = null;
  } else {
    sfx = base ? base.sfx : null;
  }
  return { motion: String(kindOrPreset), kind, event: base ? base.event : kind, sfx };
}

/** Every mapped event with the given style's gating applied — for prompts, docs, tests. */
export function listMotionSfxEvents(styleOrName = null) {
  return Object.keys(MOTION_SFX_EVENTS).map((kind) => motionSfxEvent(kind, styleOrName));
}

// ---------------------------------------------------------------------------
// 2. Style → asset preferences
// ---------------------------------------------------------------------------
//
// One declarative entry per Style Bible look (keyed by style NAME — the
// definitions themselves are untouched). Unknown/missing styles get
// 'default'. Fields:
//   music       semantic ref for the style's default track (music policy tier 3)
//   sfxLevel    'full' | 'reduced' | 'minimal' — see motionSfxEvent above
//   motionSfx   per-kind overrides of MOTION_SFX_EVENTS (null = force silent)
//   iconVariant preferred Tabler variant ('outline' | 'filled')
//   iconTerms   flavor terms tried FIRST in icon searches (plain query is the fallback)

export const STYLE_ASSET_PREFERENCES = deepFreeze({
  default: {
    music: 'music.documentary.calm',
    sfxLevel: 'full',
    motionSfx: {},
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Paper craft table: tactile rips, documentary lofi.
  'paper-collage': {
    music: 'music.documentary.calm',
    sfxLevel: 'full',
    motionSfx: { paperReveal: 'sfx.paper.rip' },
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Dark cinematic docu — grade-heavy, sound stays out of the way.
  cinematic: {
    music: 'music.cinematic.dark',
    sfxLevel: 'reduced',
    motionSfx: {},
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Archival slow-burn: cinematic ambience, sparse foley.
  documentary: {
    music: 'music.documentary.ambient',
    sfxLevel: 'reduced',
    motionSfx: {},
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Neon AI futurism: epic synth, glitches on the digital transitions.
  'ai-documentary': {
    music: 'music.epic',
    sfxLevel: 'full',
    motionSfx: { morph: 'sfx.glitch' },
    iconVariant: 'filled',
    iconTerms: [],
  },
  // Sepia archival melancholy — paper rips for the page turns.
  history: {
    music: 'music.emotional.calm',
    sfxLevel: 'reduced',
    motionSfx: { paperReveal: 'sfx.paper.rip' },
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Confident market-desk energy.
  finance: {
    music: 'music.corporate',
    sfxLevel: 'full',
    motionSfx: {},
    iconVariant: 'outline',
    iconTerms: ['finance'],
  },
  // Glitches, tech music, futuristic (filled) icons.
  'modern-tech': {
    music: 'music.tech',
    sfxLevel: 'full',
    motionSfx: { morph: 'sfx.glitch', flash: 'sfx.glitch' },
    iconVariant: 'filled',
    iconTerms: ['tech'],
  },
  // Soft whooshes only, premium calm.
  luxury: {
    music: 'music.premium',
    sfxLevel: 'reduced',
    motionSfx: { slide: 'sfx.swoosh.soft' },
    iconVariant: 'outline',
    iconTerms: [],
  },
  // Almost no SFX, quiet music.
  minimal: {
    music: 'music.quiet',
    sfxLevel: 'minimal',
    motionSfx: {},
    iconVariant: 'outline',
    iconTerms: [],
  },
});

/**
 * Preferences for a Style Bible definition, a style name, or nothing —
 * always returns a full (frozen) entry, never null. Accepting the definition
 * object keeps callers free of any name-plumbing (`assetForStyle(visual, …)`).
 */
export function stylePreferencesFor(styleOrName = null) {
  const name = typeof styleOrName === 'string' ? styleOrName : styleOrName?.name;
  return STYLE_ASSET_PREFERENCES[name] || STYLE_ASSET_PREFERENCES.default;
}

// ---------------------------------------------------------------------------
// 3. Music selection policy
// ---------------------------------------------------------------------------
//
// Priority: user choice → project setting → style default → engine fallback.
// A tier decides by returning; 'auto' (or nothing) falls through to the next
// tier; 'none' is a real decision (silence). Any other string is a semantic
// music category ("music.epic", "epic", "music.documentary.calm"). A
// "custom:<ref>" value is the reserved future shape for user-uploaded tracks —
// it selects deterministically today but resolves to no local asset yet.

export const ENGINE_FALLBACK_MUSIC = 'music.calm.background';

function normalizeMusicChoice(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  return s || null;
}

/**
 * @param {{ user?: string|null, project?: string|null, style?: object|string|null,
 *           registry?: ReturnType<import('./registry.js').createAssetRegistry> }} [opts]
 * @returns {{ policy: 'category'|'auto'|'none'|'custom', source: 'user'|'project'|'style'|'engine',
 *             ref: string|null, assetId: string|null, asset: object|null, trail: string[] }}
 */
export function selectMusic({ user = null, project = null, style = null, registry = assetRegistry } = {}) {
  const trail = [];
  const decided = (policy, source, ref, asset) => ({
    policy,
    source,
    ref,
    assetId: asset ? asset.id : null,
    asset: asset || null,
    trail,
  });

  for (const [source, raw] of [
    ['user', user],
    ['project', project],
  ]) {
    const choice = normalizeMusicChoice(raw);
    if (!choice || choice === 'auto') {
      trail.push(`${source}: auto/unset`);
      continue;
    }
    if (choice === 'none') return decided('none', source, null, null);
    if (choice.startsWith('custom:')) return decided('custom', source, choice, null);
    const asset = resolveInCategory(registry, choice, 'music');
    if (asset) return decided('category', source, choice, asset);
    trail.push(`${source}: "${choice}" did not resolve, falling through`);
  }

  const prefs = stylePreferencesFor(style);
  const styleAsset = resolveInCategory(registry, prefs.music, 'music');
  if (styleAsset) return decided('auto', 'style', prefs.music, styleAsset);
  trail.push(`style: "${prefs.music}" did not resolve, falling through`);

  const fallback = resolveInCategory(registry, ENGINE_FALLBACK_MUSIC, 'music');
  if (fallback) return decided('auto', 'engine', ENGINE_FALLBACK_MUSIC, fallback);
  trail.push('engine: fallback did not resolve (empty library?) — silence');
  return decided('none', 'engine', null, null);
}

// ---------------------------------------------------------------------------
// 4. Planner vocabulary (semantic, auto-expanding)
// ---------------------------------------------------------------------------

/**
 * The semantic music categories the library currently supports — derived from
 * the registered tracks' tags, so adding a track with a "jazzy" tag makes
 * "music.jazzy" part of the vocabulary automatically. Sorted (deterministic).
 */
export function musicCategoryVocabulary(registry = assetRegistry) {
  const tags = new Set();
  for (const track of registry.list({ category: 'music' })) {
    for (const t of track.tags) tags.add(t);
  }
  return [...tags].sort().map((t) => `music.${t}`);
}

/**
 * The per-shot SFX ids the planner may reference — content accents only
 * (applause, money, phone-ring…). Transition/riser sounds are excluded
 * because motion-driven SFX are the Motion Engine mapping's job; offering
 * them twice would double sounds on the same cut. Style-aware: a 'minimal'
 * style offers nothing, so the prompt field disappears entirely.
 */
export function plannerSfxVocabulary(styleOrName = null, registry = assetRegistry) {
  if (stylePreferencesFor(styleOrName).sfxLevel === 'minimal') return [];
  return registry
    .list({ category: 'sfx' })
    .filter((a) => !a.tags.includes('transition') && !a.tags.includes('riser'))
    .map((a) => a.id)
    .sort();
}
