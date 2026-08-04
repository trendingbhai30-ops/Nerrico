// Smoke test for the Nerrico Asset Engine — Phase 4A contracts.
// Run from backend/:  node scripts/test-assets.js
// Deterministic, pure Node. Part 1 exercises importer/registry/cache/search/
// resolver/validation against a synthetic fixture tree (built fresh each run
// under data/, which is gitignored); part 2 sanity-checks the REAL library.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAssetRegistry,
  importLocalAssets,
  searchRegistry,
  resolveInRegistry,
  resolvePathInRegistry,
  validateAssetLibrary,
  validateAssetRecord,
  initAssetEngine,
  assetRegistry,
  resolveAsset,
  resolveAssetPath,
  searchAssets,
  requestAsset,
  sfxForMotion,
  assetForPlanner,
  plannerAssetVocabulary,
  assetPathForRender,
  slugify,
} from '../src/assets/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, '..', 'data', 'asset-test-fixtures');
const FIXTURE_CACHE = path.join(__dirname, '..', 'data', 'asset-test-cache.json');

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

// --- fixture tree -------------------------------------------------------------
const SVG = (tags, category) =>
  `<!--\ntags: [${tags}]\ncategory: ${category}\nversion: "1.0"\n-->\n<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>\n`;

function buildFixtures() {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  fs.rmSync(FIXTURE_CACHE, { force: true });
  const w = (rel, content) => {
    const abs = path.join(FIXTURE_DIR, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  };
  w('music/vidssave.com Test Song 256kbps (1).mp3', 'not-really-audio-A');
  w('music/tags.json', JSON.stringify({ 'vidssave.com Test Song 256kbps (1).mp3': { tags: ['calm', 'documentary'], displayName: 'Test Song' } }));
  w('sfx/paper-rip.mp3', 'not-really-audio-B');
  w('sfx/zz-paper-rip-copy.mp3', 'not-really-audio-B'); // identical content, sorts last → duplicate skip
  w('sfx/notes.txt', 'ignore me'); // unsupported
  w('sfx/weird.xyz', 'ignore me too'); // unsupported
  w('icons/outline/coin.svg', SVG('money, coin, cash', 'E-commerce'));
  w('icons/outline/star.svg', SVG('favorite, rating', 'Shapes'));
  w('icons/filled/coin.svg', SVG('money, coin', 'E-commerce'));
  w('icons/aliases.json', JSON.stringify({ outline: { moneyz: 'coin' } }));
  w('icons/LICENSE', 'MIT');
}

buildFixtures();
const reg = createAssetRegistry();
const summary = await importLocalAssets({ registry: reg, rootDir: FIXTURE_DIR, cachePath: FIXTURE_CACHE });

// --- importer -----------------------------------------------------------------
console.log('importer:');
check('imports the fixture tree (1 music + 1 sfx + 3 icons)', summary.total === 5 && reg.size() === 5);
check('per-category counts', summary.byCategory.music === 1 && summary.byCategory.sfx === 1 && summary.byCategory.icons === 3);
check('duplicate content skipped with a note', summary.duplicates.length === 1 && summary.duplicates[0].includes('zz-paper-rip-copy'));
check('unsupported files ignored + counted', summary.unsupported.length === 2);
check('sidecars are not "unsupported"', !summary.unsupported.some((u) => u.includes('json') || u.includes('LICENSE')));
check('junk stripped from slug', reg.has('music.test-song'));
check('slugify cleans download junk', slugify('vidssave.com Foo Bar 256kbps (2)') === 'foo-bar');
check('sidecar displayName wins', reg.get('music.test-song').displayName === 'Test Song');
check('sidecar tags merged', reg.get('music.test-song').tags.includes('documentary'));
check('fake audio → duration null (graceful)', reg.get('music.test-song').duration === null);
check('svg dimensions parsed', reg.get('icon.coin').width === 24 && reg.get('icon.coin').height === 24);
check('tabler tags parsed from comment', reg.get('icon.coin').tags.includes('money'));
check('tabler category recorded', reg.get('icon.coin').metadata.tablerCategory === 'E-commerce' && reg.get('icon.coin').tags.includes('e-commerce'));
check('outline is the default variant (no suffix)', reg.has('icon.coin') && reg.get('icon.coin').metadata.variant === 'outline');
check('filled variant gets suffixed id', reg.has('icon.coin.filled') && reg.get('icon.coin.filled').metadata.variant === 'filled');
check('aliases become keywords', reg.get('icon.coin').keywords.includes('moneyz'));
check('localPath is relative with forward slashes', reg.get('icon.coin').localPath === 'icons/outline/coin.svg');
check('license/author defaults per category', reg.get('icon.coin').license.includes('MIT') && reg.get('music.test-song').license === 'unknown');
check('every record passes the schema', reg.list().every((a) => validateAssetRecord(a)));

// --- registry -----------------------------------------------------------------
console.log('registry:');
check('get() returns frozen records', Object.isFrozen(reg.get('icon.coin')) && Object.isFrozen(reg.get('icon.coin').tags));
check('unknown get() → null, has() → false', reg.get('nope.nope') === null && !reg.has('nope.nope'));
check('duplicate id registration throws', throws(() => reg.register({ ...reg.get('icon.coin') }), 'duplicate'));
check('invalid record registration throws', throws(() => reg.register({ id: 'bad' }), 'invalid asset'));
check('list filters by category and type', reg.list({ category: 'icons' }).length === 3 && reg.list({ type: 'audio' }).length === 2);
check('listIds registration order + stats', reg.listIds('icons').length === 3 && reg.stats().icons === 3);

// --- schema -------------------------------------------------------------------
console.log('schema:');
const good = { ...reg.get('music.test-song') };
check('schema rejects bad id', throws(() => validateAssetRecord({ ...good, id: 'Bad ID!' }), 'id'));
check('schema rejects unknown category', throws(() => validateAssetRecord({ ...good, category: 'fonts' }), 'category'));
check('schema rejects type/category mismatch', throws(() => validateAssetRecord({ ...good, type: 'image' }), 'match'));
check('schema rejects backslash localPath', throws(() => validateAssetRecord({ ...good, localPath: 'music\\x.mp3' }), 'localPath'));
check('schema rejects unsupported extension', throws(() => validateAssetRecord({ ...good, extension: '.exe' }), 'unsupported'));
check('schema rejects malformed hash', throws(() => validateAssetRecord({ ...good, hash: 'xyz' }), 'hash'));

// --- cache --------------------------------------------------------------------
console.log('cache:');
const reg2 = createAssetRegistry();
const summary2 = await importLocalAssets({ registry: reg2, rootDir: FIXTURE_DIR, cachePath: FIXTURE_CACHE });
check('warm re-import fully cached', summary2.fromCache === 6 && summary2.computed === 0); // 6 files incl. the duplicate
check('warm re-import registers identically', reg2.size() === 5 && reg2.get('icon.coin').hash === reg.get('icon.coin').hash);
const before = reg2.get('music.test-song');
await new Promise((r) => setTimeout(r, 20)); // ensure a distinct mtime
fs.writeFileSync(path.join(FIXTURE_DIR, 'music', 'vidssave.com Test Song 256kbps (1).mp3'), 'CHANGED-audio-bytes');
const reg3 = createAssetRegistry();
const summary3 = await importLocalAssets({ registry: reg3, rootDir: FIXTURE_DIR, cachePath: FIXTURE_CACHE });
const after = reg3.get('music.test-song');
check('file change detected (1 recomputed)', summary3.computed === 1 && summary3.fromCache === 5);
check('changed file gets a new hash', after.hash !== before.hash);
check('createdAt survives change, updatedAt moves', after.createdAt === before.createdAt && after.updatedAt !== before.updatedAt);
fs.writeFileSync(FIXTURE_CACHE, '{corrupted-json!!');
const reg4 = createAssetRegistry();
const summary4 = await importLocalAssets({ registry: reg4, rootDir: FIXTURE_DIR, cachePath: FIXTURE_CACHE });
check('corrupted cache → rebuild + warning, never fatal', reg4.size() === 5 && summary4.warnings.some((w) => w.includes('corrupted')));

// --- search -------------------------------------------------------------------
console.log('search:');
check('empty/blank query → []', searchRegistry(reg, '').length === 0 && searchRegistry(reg, '   ').length === 0);
check('tag search finds icons', searchRegistry(reg, 'money')[0].asset.id.startsWith('icon.coin'));
check('partial match works', searchRegistry(reg, 'pape')[0].asset.id === 'sfx.paper-rip');
check('AND semantics: all terms must match', searchRegistry(reg, 'coin star').length === 0);
check('category filter respected', searchRegistry(reg, 'coin', { category: 'sfx' }).length === 0);
check('type filter respected', searchRegistry(reg, 'coin', { type: 'image' }).length === 2);
check('limit respected', searchRegistry(reg, 'coin', { limit: 1 }).length === 1);
check('ranked: name+tag match outranks tag-only', searchRegistry(reg, 'coin')[0].score > searchRegistry(reg, 'money')[0].score - 1);
const twice = [searchRegistry(reg, 'coin').map((r) => r.asset.id).join(','), searchRegistry(reg, 'coin').map((r) => r.asset.id).join(',')];
check('deterministic ordering', twice[0] === twice[1]);

// --- resolver -----------------------------------------------------------------
console.log('resolver:');
check('exact id resolves', resolveInRegistry(reg, 'icon.coin.filled').id === 'icon.coin.filled');
check('semantic category+term resolves', resolveInRegistry(reg, 'sfx.paper.rip').id === 'sfx.paper-rip');
check('tag-based semantic id resolves', resolveInRegistry(reg, 'icon.money').id === 'icon.coin');
check('relaxation drops generic leading terms', resolveInRegistry(reg, 'music.nonexistent.calm').id === 'music.test-song');
check('category alias "sound" → sfx', resolveInRegistry(reg, 'sound.paper').id === 'sfx.paper-rip');
check('unresolvable → null (never throws)', resolveInRegistry(reg, 'sfx.zzz-qqq') === null && resolveInRegistry(reg, null) === null);
const p = resolvePathInRegistry(reg, 'icon.coin', FIXTURE_DIR);
check('path resolution → existing absolute file', path.isAbsolute(p) && fs.existsSync(p));

// --- validation ---------------------------------------------------------------
console.log('validation:');
const healthy = validateAssetLibrary({ registry: reg3, rootDir: FIXTURE_DIR, importSummary: summary3 });
check('healthy fixture library validates ok', healthy.ok && healthy.errors.length === 0);
check('unsupported files surface as info', healthy.info.length === 2);
check('audio-without-duration is a warning', healthy.warnings.some((w) => w.includes('duration')));
const regBad = createAssetRegistry();
regBad.register({ ...reg.get('icon.coin'), id: 'icon.ghost', localPath: 'icons/outline/ghost-missing.svg' });
const bad = validateAssetLibrary({ registry: regBad, rootDir: FIXTURE_DIR });
check('missing file → error', !bad.ok && bad.errors.some((e) => e.includes('missing file')));
const regEmpty = createAssetRegistry();
check('empty registry → warning, not error', validateAssetLibrary({ registry: regEmpty, rootDir: FIXTURE_DIR }).warnings.length === 1);

// --- real library -------------------------------------------------------------
console.log('real library:');
const real = await initAssetEngine();
check('real import: 6 music + 26 sfx + >6000 icons', real.byCategory.music === 6 && real.byCategory.sfx === 26 && real.byCategory.icons > 6000);
check('no duplicates or unsupported surprises', real.duplicates.length === 0 && real.unsupported.length === 0);
check('music.documentary.calm resolves', resolveAsset('music.documentary.calm')?.category === 'music');
check('sfx.paper.rip resolves', resolveAsset('sfx.paper.rip')?.id === 'sfx.paper-ripping');
check('icon.money resolves to a money icon', (resolveAsset('icon.money')?.tags || []).includes('money'));
check('real audio has real durations', assetRegistry.list({ category: 'music' }).every((a) => a.duration > 0));
check('search "riser" finds the risers', searchAssets('riser', { category: 'sfx' }).length >= 3);
check('requestAsset by id + category guard', requestAsset({ id: 'sfx.whoosh', category: 'sfx' })?.id === 'sfx.whoosh' && requestAsset({ id: 'sfx.whoosh', category: 'music' }) === null);
check('sfxForMotion decamels kinds', sfxForMotion('paperReveal')?.tags.includes('paper'));
check('assetForPlanner mirrors resolver', assetForPlanner('icon.rocket')?.id === 'icon.rocket');
const vocab = plannerAssetVocabulary();
check('planner vocabulary shape', vocab.music.length === 6 && vocab.sfx.length === 26 && vocab.icons.count > 6000 && vocab.icons.tags.length > 100);
const renderPath = assetPathForRender('music.feeling-blue');
check('assetPathForRender → existing file', !!renderPath && fs.existsSync(renderPath));
const realHealth = validateAssetLibrary({ registry: assetRegistry, importSummary: real });
check('real library validates clean', realHealth.ok && realHealth.errors.length === 0);

// --- wrap-up ------------------------------------------------------------------
fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
fs.rmSync(FIXTURE_CACHE, { force: true });
console.log(`\n${total - failures}/${total} checks passed`);
if (failures > 0) process.exit(1);
