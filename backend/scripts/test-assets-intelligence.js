// Smoke test for the Nerrico Asset Engine — Phase 4B (asset intelligence).
// Run from backend/:  node scripts/test-assets-intelligence.js
//
// Deterministic, pure Node. Covers the Phase 4B contracts on top of the 4A
// foundation (which scripts/test-assets.js still guards unchanged):
//   semantic resolution · resolver fallback · style-aware selection ·
//   motion→SFX mapping · music selection policy · planner integration ·
//   duplicate safety.
// Real-library sections resolve against assets/; policy edge cases use tiny
// in-memory fixture registries (no files involved).

import {
  initAssetEngine,
  assetRegistry,
  createAssetRegistry,
  resolveAsset,
  resolveInCategory,
  stylePreferencesFor,
  STYLE_ASSET_PREFERENCES,
  MOTION_SFX_EVENTS,
  motionKindOf,
  motionSfxEvent,
  listMotionSfxEvents,
  sfxForMotion,
  assetForStyle,
  selectMusic,
  ENGINE_FALLBACK_MUSIC,
  musicCategoryVocabulary,
  plannerSfxVocabulary,
  plannerAssetVocabulary,
} from '../src/assets/index.js';
import { styleBible, getVisualStyle } from '../src/content/stylebible/index.js';
import { shotsPrompt } from '../src/content/prompts.js';
import { validateShots } from '../src/core/scenes.js';

let failures = 0;
let total = 0;
function check(name, cond) {
  total++;
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}
function throws(fn, match = null) {
  try {
    fn();
    return false;
  } catch (e) {
    return match ? String(e.message).includes(match) : true;
  }
}

// In-memory fixture records for policy edge cases (registry-only; no files).
const makeAsset = (over = {}) => ({
  id: 'music.fixture',
  name: 'fixture',
  displayName: 'Fixture',
  type: 'audio',
  category: 'music',
  localPath: 'music/fixture.webm',
  extension: '.webm',
  size: 1,
  duration: 10,
  width: null,
  height: null,
  license: 'unknown',
  author: '',
  tags: [],
  keywords: [],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  hash: 'a'.repeat(40),
  metadata: {},
  ...over,
});

await initAssetEngine();

// --- semantic resolution (the Phase 4B id vocabulary) --------------------------
console.log('semantic resolution:');
const MUSIC_IDS = ['music.documentary.calm', 'music.epic', 'music.corporate', 'music.tech', 'music.emotional', 'music.upbeat'];
check('every semantic music category resolves to a music track', MUSIC_IDS.every((r) => resolveAsset(r)?.category === 'music'));
check('music.epic is a cinematic/dramatic track', (resolveAsset('music.epic').tags || []).includes('epic'));
check('music.upbeat ≠ music.emotional (categories differentiate)', resolveAsset('music.upbeat').id !== resolveAsset('music.emotional').id);
check('camelCase semantic ref: sfx.paperRip', resolveAsset('sfx.paperRip')?.id === 'sfx.paper-ripping');
check('camelCase ≡ dotted form', resolveAsset('sfx.paperRip')?.id === resolveAsset('sfx.paper.rip')?.id);
check('sfx.camera resolves to a camera sound', (resolveAsset('sfx.camera')?.tags || []).includes('camera'));
check('sfx.glitch resolves', resolveAsset('sfx.glitch')?.id === 'sfx.error-glitch');
check('sfx.click resolves exactly', resolveAsset('sfx.click')?.id === 'sfx.click');
check('icon.money is a money icon', (resolveAsset('icon.money')?.tags || []).includes('money'));
check('icon.ai / icon.chart / icon.warning resolve to icons', ['icon.ai', 'icon.chart', 'icon.warning'].every((r) => resolveAsset(r)?.category === 'icons'));

// --- resolver fallback ----------------------------------------------------------
console.log('resolver fallback:');
check('relaxation drops unmatched leading terms', resolveAsset('music.nonexistent-flavor.calm')?.category === 'music');
check('unresolvable → null, never throws', resolveAsset('sfx.zzz-totally-made-up') === null && resolveAsset(undefined) === null);
check('resolveInCategory guards the category', resolveInCategory(assetRegistry, 'paper', 'music') === null);
check('resolveInCategory accepts bare refs', resolveInCategory(assetRegistry, 'epic', 'music')?.id === resolveAsset('music.epic').id);
check('resolveInCategory tolerates junk input', resolveInCategory(assetRegistry, null, 'music') === null && resolveInCategory(assetRegistry, 42, 'sfx') === null);

// --- style selection ------------------------------------------------------------
console.log('style selection:');
check('every preference key (except default) is a registered active style', Object.keys(STYLE_ASSET_PREFERENCES).filter((k) => k !== 'default').every((k) => styleBible.get(k)?.status === 'active'));
check('every active style has an explicit preference entry', styleBible.listActive().every((name) => STYLE_ASSET_PREFERENCES[name]));
check('every style music pref resolves in the real library', Object.values(STYLE_ASSET_PREFERENCES).every((p) => resolveInCategory(assetRegistry, p.music, 'music')));
check('every motionSfx override resolves in the real library', Object.values(STYLE_ASSET_PREFERENCES).flatMap((p) => Object.values(p.motionSfx)).filter(Boolean).every((r) => resolveInCategory(assetRegistry, r, 'sfx')));
check('prefs accept a definition object, a name, or nothing', stylePreferencesFor(getVisualStyle('luxury')) === STYLE_ASSET_PREFERENCES.luxury && stylePreferencesFor('luxury') === STYLE_ASSET_PREFERENCES.luxury && stylePreferencesFor(null) === STYLE_ASSET_PREFERENCES.default);
check('unknown style → default prefs (never null)', stylePreferencesFor('does-not-exist') === STYLE_ASSET_PREFERENCES.default);
check('bare music request follows the style (luxury → premium calm)', assetForStyle('luxury', { category: 'music' })?.id === 'music.lilac-skies');
check('bare music request follows the style (modern-tech → tech)', assetForStyle('modern-tech', { category: 'music' })?.id === 'music.blade-runner-2049');
check('assetForStyle without prefs behaves like Phase 4A', assetForStyle(null, { id: 'sfx.whoosh' })?.id === 'sfx.whoosh');
const outlineCoin = assetForStyle('paper-collage', { category: 'icons', query: 'coin' });
const filledCoin = assetForStyle('modern-tech', { category: 'icons', query: 'coin' });
check('icon variant preference: outline style → outline icon', outlineCoin && outlineCoin.metadata.variant === 'outline');
check('icon variant preference: filled style → filled sibling', filledCoin && filledCoin.metadata.variant === 'filled');

// --- motion mapping -------------------------------------------------------------
console.log('motion mapping:');
check('kinds map to themselves, presets to their kind', motionKindOf('paperReveal') === 'paperReveal' && motionKindOf('impactShake') === 'shake' && motionKindOf('rackFocus') === 'focusPull' && motionKindOf('heroReveal') === 'slide' && motionKindOf('pushIn') === 'push');
check('unknown motion name → null kind', motionKindOf('doesNotExist') === null && motionKindOf('') === null);
const expectDefault = { slide: 'sfx.whoosh', whip: 'sfx.swoosh', flash: 'sfx.camera-shutter', paperReveal: 'sfx.paper-tear', push: 'sfx.booms', shake: 'sfx.booms', focusPull: 'sfx.click-soft' };
check('all seven semantic events resolve to the expected local assets', Object.entries(expectDefault).every(([kind, id]) => sfxForMotion(kind)?.id === id));
check('silent by design: fade/morph/zoom carry no sound', ['fade', 'morph', 'zoom', 'pan'].every((k) => motionSfxEvent(k)?.sfx === null && sfxForMotion(k) === null));
check('presets inherit their kind sound', sfxForMotion('impactShake')?.id === 'sfx.booms' && sfxForMotion('heroReveal')?.id === 'sfx.whoosh');
check('event shape carries motion/kind/event/sfx', (() => { const e = motionSfxEvent('impactShake'); return e.motion === 'impactShake' && e.kind === 'shake' && e.event === 'shake' && e.sfx === 'sfx.impact'; })());
check('style override: paper-collage paperReveal → paper RIP', sfxForMotion('paperReveal', 'paper-collage')?.id === 'sfx.paper-ripping');
check('style override: luxury slide → soft swoosh', sfxForMotion('slide', 'luxury')?.id === 'sfx.transition-swoosh');
check('style override can voice a silent kind (modern-tech morph → glitch)', sfxForMotion('morph', 'modern-tech')?.id === 'sfx.error-glitch');
check('reduced level: camera moves silent, transitions keep sound', sfxForMotion('push', 'documentary') === null && sfxForMotion('slide', 'documentary')?.id === 'sfx.whoosh');
check('minimal level: everything silent (no overrides declared)', ['slide', 'whip', 'push', 'paperReveal'].every((k) => sfxForMotion(k, 'minimal') === null));
check('style accepts the definition object too', sfxForMotion('paperReveal', getVisualStyle('paper-collage'))?.id === 'sfx.paper-ripping');
check('unknown-to-motion names keep the Phase 4A search behaviour', sfxForMotion('paper ripping')?.id === 'sfx.paper-ripping');
check('listMotionSfxEvents covers the full table', listMotionSfxEvents().length === Object.keys(MOTION_SFX_EVENTS).length);

// --- music policy ---------------------------------------------------------------
console.log('music policy:');
const luxury = getVisualStyle('luxury');
check('style default tier (no choices)', (() => { const d = selectMusic({ style: luxury }); return d.policy === 'auto' && d.source === 'style' && d.assetId === 'music.lilac-skies'; })());
check('project setting beats style default', (() => { const d = selectMusic({ project: 'music.epic', style: luxury }); return d.policy === 'category' && d.source === 'project' && d.assetId === 'music.blade-runner-2049'; })());
check('user choice beats project setting', (() => { const d = selectMusic({ user: 'music.upbeat', project: 'music.epic', style: luxury }); return d.source === 'user' && d.assetId === resolveAsset('music.upbeat').id; })());
check('"none" is a real decision at any tier', selectMusic({ user: 'none', project: 'music.epic' }).policy === 'none' && selectMusic({ project: 'NONE ' }).policy === 'none');
check('"auto" falls through to the next tier', (() => { const d = selectMusic({ user: 'auto', project: 'auto', style: luxury }); return d.source === 'style' && d.assetId === 'music.lilac-skies'; })());
check('unresolvable choice degrades with a trail, never crashes', (() => { const d = selectMusic({ project: 'music.zzz-genre', style: luxury }); return d.source === 'style' && d.trail.some((t) => t.includes('did not resolve')); })());
check('future custom upload is reserved and deterministic', (() => { const d = selectMusic({ user: 'custom:my-track' }); return d.policy === 'custom' && d.source === 'user' && d.ref === 'custom:my-track' && d.assetId === null; })());
check('bare categories work as choices ("epic")', selectMusic({ project: 'epic' }).assetId === resolveAsset('music.epic').id);
const fixtureReg = createAssetRegistry();
fixtureReg.register(makeAsset({ id: 'music.generic', name: 'generic', tags: ['calm', 'background'] }));
check('engine fallback when the style pref cannot resolve', (() => { const d = selectMusic({ style: 'luxury', registry: fixtureReg }); return d.policy === 'auto' && d.source === 'engine' && d.ref === ENGINE_FALLBACK_MUSIC && d.assetId === 'music.generic'; })());
check('empty library → silence, never a crash', (() => { const d = selectMusic({ registry: createAssetRegistry() }); return d.policy === 'none' && d.source === 'engine' && d.assetId === null; })());
check('selection is deterministic', JSON.stringify(selectMusic({ project: 'music.epic', style: luxury })) === JSON.stringify(selectMusic({ project: 'music.epic', style: luxury })));
check('selection result is JSON-serializable (no paths, no records needed)', (() => { const d = selectMusic({ style: luxury }); const round = JSON.parse(JSON.stringify({ policy: d.policy, source: d.source, ref: d.ref, assetId: d.assetId })); return round.assetId === 'music.lilac-skies' && !JSON.stringify(round).includes('\\\\') && !round.assetId.includes('/'); })());

// --- planner integration ----------------------------------------------------------
console.log('planner integration:');
const words = Array.from({ length: 30 }, (_, i) => ({ word: `w${i}` }));
const collagePrompt = shotsPrompt({ title: 'T', script: 'S', words, visual: getVisualStyle('paper-collage') });
const minimalPrompt = shotsPrompt({ title: 'T', script: 'S', words, visual: getVisualStyle('minimal') });
check('shotsPrompt offers the semantic sfx field', collagePrompt.includes('"sfx"') && collagePrompt.includes('sfx.money'));
check('prompt vocabulary is ids only — no filenames or paths', !/\.(mp3|webm|svg)\b/.test(collagePrompt) && !collagePrompt.includes('\\'));
check('minimal style: the sfx field never enters the vocabulary', !minimalPrompt.includes('"sfx"'));
check('planner sfx vocabulary excludes motion-owned sounds', (() => { const v = plannerSfxVocabulary('paper-collage'); return v.length > 0 && !v.includes('sfx.whoosh') && !v.includes('sfx.riser') && v.includes('sfx.money'); })());
const shots = validateShots({ shots: [
  { start: 0, end: 9, imagePrompt: 'a', sfx: 'sfx.money' },
  { start: 10, end: 19, imagePrompt: 'b', sfx: 'sfx.paperRip' },
  { start: 20, end: 24, imagePrompt: 'c', sfx: 'sfx.not-a-real-thing-zz' },
  { start: 25, end: 29, imagePrompt: 'd' },
] }, 30);
check('planner-emitted sfx refs are kept, canonicalized to registry ids', shots[0].sfx === 'sfx.money' && shots[1].sfx === 'sfx.paper-ripping');
check('unresolvable/missing sfx stripped to null (never crashes a render)', shots[2].sfx === null && shots[3].sfx === null);
check('wrong-category refs are rejected', validateShots({ shots: [{ start: 0, end: 29, imagePrompt: 'a', sfx: 'music.epic' }] }, 30)[0].sfx === null);
const vocab = plannerAssetVocabulary('modern-tech');
check('Phase 4A vocabulary shape untouched', vocab.music.length === 6 && vocab.sfx.length === 26 && vocab.icons.count > 6000);
check('semantic vocabulary added: categories/events/plannerSfx', vocab.musicCategories.includes('music.epic') && vocab.sfxEvents.length === 7 && vocab.plannerSfx.length > 0);
check('music categories expand automatically with the library', (() => { const r = createAssetRegistry(); r.register(makeAsset({ id: 'music.new', name: 'new', tags: ['jazzy'] })); return musicCategoryVocabulary(r).includes('music.jazzy'); })());

// --- duplicate safety ---------------------------------------------------------------
console.log('duplicate safety:');
check('duplicate id registration still throws', throws(() => fixtureReg.register(makeAsset({ id: 'music.generic', name: 'generic' })), 'duplicate'));
const sizeBefore = assetRegistry.size();
await initAssetEngine();
check('initAssetEngine is idempotent (no duplicate registrations)', assetRegistry.size() === sizeBefore);
const reimport = await initAssetEngine({ force: true });
check('forced re-import lands on identical counts', assetRegistry.size() === sizeBefore && reimport.duplicates.length === 0);
check('preference tables are frozen (no runtime mutation)', Object.isFrozen(STYLE_ASSET_PREFERENCES) && Object.isFrozen(STYLE_ASSET_PREFERENCES.luxury.motionSfx) && Object.isFrozen(MOTION_SFX_EVENTS));
check('style prefs table has no entry for future styles', !STYLE_ASSET_PREFERENCES['pixar-style'] && !STYLE_ASSET_PREFERENCES.anime);

// --- wrap-up ------------------------------------------------------------------------
console.log(`\n${total - failures}/${total} checks passed`);
if (failures > 0) process.exit(1);
