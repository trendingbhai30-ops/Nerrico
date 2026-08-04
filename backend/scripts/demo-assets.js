// Asset Engine demonstration — Phase 4A.
// Run from backend/:  node scripts/demo-assets.js
// Imports the real local library and walks every subsystem: importer,
// registry, search, resolver, integration seams, validation.

import {
  initAssetEngine,
  assetRegistry,
  searchAssets,
  resolveAsset,
  resolveAssetPath,
  validateAssetLibrary,
  sfxForMotion,
  plannerAssetVocabulary,
} from '../src/assets/index.js';

const line = (c = '─') => console.log(c.repeat(64));
const fmt = (a) =>
  a
    ? `${a.id}  [${a.type}] ${a.duration !== null ? a.duration + 's' : a.width ? `${a.width}x${a.height}` : ''}  "${a.displayName}"`
    : '(null)';

line('═');
console.log('NERRICO ASSET ENGINE — DEMO');
line('═');

// 1. Import ------------------------------------------------------------------
const summary = await initAssetEngine();
console.log('\n1. IMPORT');
console.log(`   total: ${summary.total}  (${Object.entries(summary.byCategory).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
console.log(`   from cache: ${summary.fromCache}, computed: ${summary.computed}`);
console.log(`   duplicates skipped: ${summary.duplicates.length}, unsupported ignored: ${summary.unsupported.length}`);

// 2. Registry ----------------------------------------------------------------
console.log('\n2. REGISTRY');
console.log('   stats:', assetRegistry.stats());
console.log('   music ids:', assetRegistry.listIds('music').join(', '));
console.log('   sample lookup:', fmt(assetRegistry.get('music.feeling-blue')));

// 3. Search ------------------------------------------------------------------
console.log('\n3. SEARCH (ranked, partial matching)');
for (const [query, opts] of [
  ['calm', { category: 'music' }],
  ['paper', { category: 'sfx' }],
  ['money', { category: 'icons', limit: 5 }],
  ['chart line', { category: 'icons', limit: 3 }],
  ['transition whoosh', {}],
]) {
  const hits = searchAssets(query, { limit: 5, ...opts });
  console.log(`   "${query}"${opts.category ? ` in ${opts.category}` : ''}:`);
  for (const { asset, score } of hits.slice(0, 5)) console.log(`      ${String(score).padStart(4)}  ${asset.id}`);
}

// 4. Resolver ----------------------------------------------------------------
console.log('\n4. RESOLVER (semantic ids — scenes never see file paths)');
for (const ref of [
  'music.documentary.calm',
  'music.upbeat',
  'sfx.paper.rip',
  'sfx.camera',
  'icon.money',
  'icon.coin.filled',
  'icon.rocket',
  'sfx.does-not-exist-xyz',
]) {
  console.log(`   ${ref.padEnd(26)} → ${fmt(resolveAsset(ref))}`);
}
console.log(`   path of sfx.paper.rip     → ${resolveAssetPath('sfx.paper.rip')}`);

// 5. Integration seams -------------------------------------------------------
console.log('\n5. INTEGRATION SEAMS');
console.log(`   sfxForMotion('whip')        → ${fmt(sfxForMotion('whip'))}`);
console.log(`   sfxForMotion('paperReveal') → ${fmt(sfxForMotion('paperReveal'))}`);
const vocab = plannerAssetVocabulary();
console.log(`   planner vocabulary: ${vocab.music.length} music, ${vocab.sfx.length} sfx, ${vocab.icons.count} icons (${vocab.icons.tags.length} icon tags)`);

// 6. Validation --------------------------------------------------------------
console.log('\n6. VALIDATION');
const report = validateAssetLibrary({ registry: assetRegistry, importSummary: summary });
console.log(`   ok: ${report.ok}  errors: ${report.errors.length}  warnings: ${report.warnings.length}  info: ${report.info.length}`);
for (const e of report.errors.slice(0, 5)) console.log(`   ERROR ${e}`);
for (const w of report.warnings.slice(0, 5)) console.log(`   warn  ${w}`);

line('═');
console.log(report.ok ? 'DEMO COMPLETE — library healthy' : 'DEMO COMPLETE — validation FAILED');
line('═');
