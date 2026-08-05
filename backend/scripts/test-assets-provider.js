// Smoke test for the Nerrico Asset Engine — Phase 4C (provider + render integration).
// Run from backend/:  node scripts/test-assets-provider.js
//
// Deterministic, pure Node (the HTTP section binds an ephemeral port on
// 127.0.0.1). Covers the Phase 4C contracts on top of 4A/4B (which
// test-assets.js and test-assets-intelligence.js still guard unchanged):
//   provider objects · timeline builder · music layer · SFX layer ·
//   icon layer · planner flow-through · /api/assets routes ·
//   fallbacks · backwards compatibility.

import {
  initAssetEngine,
  createAssetRegistry,
  resolveAsset,
  provideAsset,
  provideMusic,
  provideSfx,
  provideIcon,
  publicAsset,
  assetUrl,
  buildAssetTimeline,
  selectMusic,
  TIMELINE_DEFAULTS,
  PROVIDER_MIX,
  DEFAULT_SFX_SECONDS,
} from '../src/assets/index.js';
import { validateShots } from '../src/core/scenes.js';
import { createApp } from '../src/api/app.js';

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

// --- provider objects -----------------------------------------------------------
console.log('provider objects:');
const epic = provideAsset('music.epic');
check('semantic ref → render-ready object', epic && epic.assetId === resolveAsset('music.epic').id && epic.category === 'music' && epic.type === 'audio');
check('carries the full timeline contract', Object.keys(TIMELINE_DEFAULTS).every((k) => k in epic));
check('timeline defaults applied', epic.start === 0 && epic.end === null && epic.volume === 1 && epic.loop === false && epic.fadeIn === 0 && epic.fadeOut === 0 && epic.enabled === true && epic.priority === 0);
check('src is a provider URL, never a path', epic.src === `/api/assets/${epic.assetId}/file` && !epic.src.includes('\\') && !JSON.stringify(epic).includes('\\'));
check('no filesystem fields leak', !('localPath' in epic) && !('hash' in epic));
check('object is frozen + JSON-safe', Object.isFrozen(epic) && JSON.parse(JSON.stringify(epic)).assetId === epic.assetId);
check('baseUrl prefixes the src', provideAsset('music.epic', { baseUrl: 'http://127.0.0.1:4000' }).src.startsWith('http://127.0.0.1:4000/api/assets/'));
check('timeline overrides win', (() => { const a = provideAsset('sfx.click', { start: 2, volume: 0.3, priority: 5 }); return a.start === 2 && a.volume === 0.3 && a.priority === 5; })());
check('future fields ride along untouched', provideAsset('sfx.click', { shimmer: 'gold' }).shimmer === 'gold');
check('accepts an already-resolved record', provideAsset(resolveAsset('sfx.click')).assetId === 'sfx.click');
check('category guard: wrong category → null', provideAsset('music.epic', { category: 'sfx' }) === null);
check('unknown/junk refs → null, never throw', provideAsset('sfx.zzz-not-real') === null && provideAsset(null) === null && provideAsset(42) === null);
check('assetUrl works from id or record', assetUrl('sfx.click') === '/api/assets/sfx.click/file' && assetUrl(resolveAsset('sfx.click'), 'http://x') === 'http://x/api/assets/sfx.click/file');
const pub = publicAsset(resolveAsset('music.epic'));
check('publicAsset: metadata without filesystem fields', pub && pub.url && pub.license && !('localPath' in pub) && !('hash' in pub));

// --- music layer ----------------------------------------------------------------
console.log('music layer:');
const bed = provideMusic('music.epic');
check('music defaults: looping ducked bed with fades', bed.loop === true && bed.volume === PROVIDER_MIX.music.volume && bed.fadeIn === PROVIDER_MIX.music.fadeIn && bed.fadeOut === PROVIDER_MIX.music.fadeOut && bed.priority === PROVIDER_MIX.music.priority);
check('music end=null = play to the video end', bed.end === null && bed.start === 0);
check('music guard: non-music ref → null', provideMusic('sfx.click') === null);
check('mix table is frozen', Object.isFrozen(PROVIDER_MIX) && Object.isFrozen(PROVIDER_MIX.music));

// --- sfx layer ------------------------------------------------------------------
console.log('sfx layer:');
const hit = provideSfx('sfx.click', { start: 4 });
check('sfx end pre-filled from the clip duration', hit.end !== null && Math.abs(hit.end - (4 + hit.duration)) < 1e-9);
check('sfx defaults to the content-accent mix', hit.volume === PROVIDER_MIX.sceneSfx.volume && hit.priority === PROVIDER_MIX.sceneSfx.priority);
const unmeasuredReg = createAssetRegistry();
unmeasuredReg.register(makeAsset({ id: 'sfx.mystery', name: 'mystery', category: 'sfx', localPath: 'sfx/mystery.mp3', extension: '.mp3', duration: null }));
check('unmeasured duration → bounded default slot', provideSfx('sfx.mystery', { registry: unmeasuredReg, start: 1 }).end === 1 + DEFAULT_SFX_SECONDS);
check('explicit end override is respected', provideSfx('sfx.click', { start: 0, end: 0.5 }).end === 0.5);
check('sfx guard: non-sfx ref → null', provideSfx('music.epic') === null);

// --- icon layer -----------------------------------------------------------------
console.log('icon layer:');
const icon = provideIcon('icon.money');
check('semantic icon lookup → render-ready image object', icon && icon.category === 'icons' && icon.type === 'image' && icon.src.endsWith('/file'));
check('future fields declared, defaulted to null', icon.color === null && icon.size === null && icon.animation === null);
check('color/size/animation pass through', (() => { const i = provideIcon('icon.chart', { color: '#e63b2e', size: 96, animation: 'pop' }); return i.color === '#e63b2e' && i.size === 96 && i.animation === 'pop'; })());
check('icon guard: non-icon ref → null', provideIcon('music.epic') === null);
check('icons carry the timeline contract too', Object.keys(TIMELINE_DEFAULTS).every((k) => k in icon));

// --- asset timeline -------------------------------------------------------------
console.log('asset timeline:');
const words = Array.from({ length: 30 }, (_, i) => ({ word: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
const shots = validateShots({ shots: [
  { start: 0, end: 9, imagePrompt: 'a', transition: 'slide', sfx: 'sfx.money' },
  { start: 10, end: 19, imagePrompt: 'b', motion: 'impactShake' },
  { start: 20, end: 29, imagePrompt: 'c', transition: 'whip', icons: ['💰', 'icon.money'] },
] }, 30);
const tl = buildAssetTimeline({ scenes: shots, words, durationSec: 15, style: 'paper-collage', projectMusic: 'auto', baseUrl: 'http://127.0.0.1:4000' });
check('one music bed from the style tier', tl.music.length === 1 && tl.music[0].source === 'style' && tl.music[0].loop === true);
check('music bed matches the selection policy exactly', tl.music[0].assetId === selectMusic({ project: 'auto', style: 'paper-collage' }).assetId);
check('motion SFX: transition + camera preset + whip all fire', tl.sfx.filter((s) => s.event === 'motion').length === 3);
check('planner content accent placed at its scene start', (() => { const a = tl.sfx.find((s) => s.event === 'scene'); return a && a.assetId === 'sfx.money' && a.scene === 0 && a.start === 0; })());
check('SFX start follows word timings', (() => { const m = tl.sfx.find((s) => s.scene === 1); return m && m.start === words[shots[1].start].start; })());
check('motion vs content mixes differ', tl.sfx.find((s) => s.event === 'motion').volume === PROVIDER_MIX.motionSfx.volume && tl.sfx.find((s) => s.event === 'scene').volume === PROVIDER_MIX.sceneSfx.volume);
check('every entry is render-ready (src + full timeline fields)', [...tl.music, ...tl.sfx, ...tl.icons].every((t) => t.src.startsWith('http://127.0.0.1:4000/api/assets/') && Object.keys(TIMELINE_DEFAULTS).every((k) => k in t)));
check('semantic icon ref becomes a scene-timed icon object', tl.icons.length === 1 && tl.icons[0].assetId === resolveAsset('icon.money').id && tl.icons[0].scene === 2 && tl.icons[0].end === 15);
check('emoji icons are left to the compositions (not assets)', !tl.icons.some((i) => i.ref === '💰'));
check('timeline is deterministic', JSON.stringify(tl) === JSON.stringify(buildAssetTimeline({ scenes: shots, words, durationSec: 15, style: 'paper-collage', projectMusic: 'auto', baseUrl: 'http://127.0.0.1:4000' })));
check('timeline is JSON-safe, no paths anywhere', !JSON.stringify(tl).includes('\\') && !/\.(mp3|webm|svg)"/.test(JSON.stringify(tl)));

const planned = buildAssetTimeline({ scenes: shots, words, durationSec: 15, style: 'paper-collage', musicPlan: { policy: 'category', source: 'project', ref: 'music.epic', assetId: resolveAsset('music.epic').id } });
check('persisted musicPlan wins over re-selection', planned.music[0].assetId === resolveAsset('music.epic').id && planned.music[0].source === 'project');
check('musicPlan policy "none" = silence', buildAssetTimeline({ scenes: shots, words, durationSec: 15, musicPlan: { policy: 'none', source: 'user', ref: null, assetId: null } }).music.length === 0);
check('custom upload placeholder = no bed today, no crash', buildAssetTimeline({ scenes: shots, words, durationSec: 15, musicPlan: { policy: 'custom', source: 'user', ref: 'custom:my-track', assetId: null } }).music.length === 0);

// --- style gating + dedup ---------------------------------------------------------
console.log('style gating:');
const minimalTl = buildAssetTimeline({ scenes: shots, words, durationSec: 15, style: 'minimal', projectMusic: 'auto' });
check('minimal style: all motion SFX gated off', minimalTl.sfx.filter((s) => s.event === 'motion').length === 0);
check('minimal style still allows planner accents (gated at prompt time)', minimalTl.sfx.filter((s) => s.event === 'scene').length === 1);
const luxTl = buildAssetTimeline({ scenes: shots, words, durationSec: 15, style: 'luxury' });
check('style overrides reach the timeline (luxury slide → soft swoosh)', luxTl.sfx.find((s) => s.scene === 0 && s.event === 'motion')?.assetId === 'sfx.transition-swoosh');
const dupShots = validateShots({ shots: [{ start: 0, end: 29, imagePrompt: 'a', transition: 'slide', motion: 'heroReveal' }] }, 30);
check('same sound at the same moment is played once', buildAssetTimeline({ scenes: dupShots, words, durationSec: 15, style: 'paper-collage', musicPlan: { policy: 'none' } }).sfx.length === 1);

// --- fallbacks + backwards compatibility ------------------------------------------
console.log('fallbacks + backwards compatibility:');
check('no inputs at all → engine-fallback music, empty layers, no crash', (() => { const t = buildAssetTimeline(); return t.sfx.length === 0 && t.icons.length === 0 && Array.isArray(t.music); })());
check('empty registry → fully silent timeline, no crash', (() => { const t = buildAssetTimeline({ scenes: shots, words, durationSec: 15, registry: createAssetRegistry() }); return t.music.length === 0 && t.sfx.length === 0 && t.icons.length === 0; })());
const legacyScenes = [
  { type: 'headline', start: 0, end: 14, emphasis: [], scheme: 0 },
  { type: 'stat', start: 15, end: 29, value: '90%', scheme: 1 },
];
const legacyTl = buildAssetTimeline({ scenes: legacyScenes, words, durationSec: 15, projectMusic: 'auto' });
check('legacy vox scenes (no motion/sfx fields) → music only', legacyTl.sfx.length === 0 && legacyTl.icons.length === 0 && legacyTl.music.length === 1);
check('legacy project without musicPlan re-derives the 4B decision', legacyTl.music[0].assetId === selectMusic({ project: 'auto', style: null }).assetId);
check('scenes missing word coverage degrade to t=0, never crash', buildAssetTimeline({ scenes: shots, words: [], durationSec: 15, musicPlan: { policy: 'none' } }).sfx.every((s) => s.start === 0));

// --- /api/assets routes (render integration surface) ------------------------------
console.log('/api/assets routes:');
const server = createApp().listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
const click = resolveAsset('sfx.click');

const meta = await fetch(`${base}/api/assets/${click.id}`);
const metaBody = await meta.json();
check('GET /api/assets/:id → public metadata', meta.status === 200 && metaBody.id === click.id && metaBody.url === `/api/assets/${click.id}/file`);
check('metadata never exposes filesystem fields', !('localPath' in metaBody) && !('hash' in metaBody) && !JSON.stringify(metaBody).includes('\\'));

const file = await fetch(`${base}/api/assets/${click.id}/file`);
const bytes = await file.arrayBuffer();
check('GET /api/assets/:id/file streams the asset', file.status === 200 && bytes.byteLength === click.size);
check('audio content type from the extension', (file.headers.get('content-type') || '').startsWith('audio/'));
const iconFile = await fetch(`${base}/api/assets/${resolveAsset('icon.money').id}/file`);
check('icons stream as SVG', iconFile.status === 200 && (iconFile.headers.get('content-type') || '').includes('image/svg+xml'));
check('provider src URLs resolve against the live server', (await fetch(base + provideAsset('music.epic').src)).status === 200);
check('unknown id → 404 (exact ids only, no search surface)', (await fetch(`${base}/api/assets/sfx.zzz-not-real/file`)).status === 404);
check('semantic refs are NOT resolved by the route', (await fetch(`${base}/api/assets/sfx.paperRip/file`)).status !== 200);
check('malformed id → 400', (await fetch(`${base}/api/assets/..%5Csecrets/file`)).status === 400);
// --- wrap-up ------------------------------------------------------------------------
console.log(`\n${total - failures}/${total} checks passed`);
// Explicit exit: close() alone trips a libuv assertion on Windows when
// keep-alive sockets are still winding down.
server.close(() => process.exit(failures > 0 ? 1 : 0));

