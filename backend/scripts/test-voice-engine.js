// Nerrico Voice Engine — smoke test (Phase 5A).
// Run: node scripts/test-voice-engine.js  (from backend/)
//
// Pure Node — no server, no filesystem, no async. Every check is deterministic.
// Target: all checks pass; process exits 0.

import {
  voiceRegistry, createVoiceRegistry,
  VOICE_PROVIDERS, VOICE_TIERS, validateVoiceRecord,
  resolveVoice, resolveByProviderId, SEMANTIC_VOICE_REFS,
  searchVoices,
  validateVoiceRegistry,
  selectVoice, plannerVoiceVocabulary,
  LANGUAGE_DEFAULTS, ENGINE_FALLBACK_VOICE, MODE_VOICE_PREFERENCES,
  voiceForMode, voiceForLegacyId, plannerVoiceSeam, requestVoice,
  listActiveVoices, voiceOptions,
} from '../src/voice/index.js';

let passed = 0;
let failed = 0;
const errs = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    process.stdout.write(`  ✓ ${label}\n`);
  } else {
    failed++;
    errs.push(label + (detail ? ` — ${detail}` : ''));
    process.stdout.write(`  ✗ ${label}${detail ? ` — ${detail}` : ''}\n`);
  }
}

function throws(label, fn) {
  try { fn(); check(label, false, 'expected throw, got none'); }
  catch (e) { check(label, true); }
}

function section(title) { console.log(`\n── ${title}`); }

// ============================================================
// 1. Schema — validateVoiceRecord
// ============================================================
section('Schema');

const VALID_VOICE = {
  id: 'voice.test', displayName: 'Test', provider: 'elevenlabs',
  voiceId: 'abc123', gender: 'male', accent: 'us',
  languages: ['english'], tags: ['narrator'], tier: 'free-premade',
  supportsWordTimestamps: true, supportsMultilingual: false, supportsEmotion: false,
  defaultSettings: { stability: 0.5 }, modelCompatibility: ['eleven_monolingual_v1'],
  status: 'active', createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z', metadata: {},
};

check('valid record passes validation', !!validateVoiceRecord({ ...VALID_VOICE }));
throws('id without "voice." prefix throws', () => validateVoiceRecord({ ...VALID_VOICE, id: 'george' }));
throws('missing displayName throws',        () => validateVoiceRecord({ ...VALID_VOICE, displayName: '' }));
throws('unknown provider throws',           () => validateVoiceRecord({ ...VALID_VOICE, provider: 'fakellabs' }));
throws('missing voiceId throws',            () => validateVoiceRecord({ ...VALID_VOICE, voiceId: '' }));
throws('invalid gender throws',             () => validateVoiceRecord({ ...VALID_VOICE, gender: 'robot' }));
check('null gender is valid',               !!validateVoiceRecord({ ...VALID_VOICE, gender: null }));
throws('empty languages array throws',      () => validateVoiceRecord({ ...VALID_VOICE, languages: [] }));
throws('unknown tier throws',               () => validateVoiceRecord({ ...VALID_VOICE, tier: 'hobbyist' }));
throws('provider/tier mismatch throws',     () => validateVoiceRecord({ ...VALID_VOICE, provider: 'elevenlabs', tier: 'local' }));
throws('non-boolean supportsTimestamps',    () => validateVoiceRecord({ ...VALID_VOICE, supportsWordTimestamps: 'yes' }));

// ============================================================
// 2. Registry — createVoiceRegistry
// ============================================================
section('Registry');

const reg = createVoiceRegistry();
check('fresh registry is empty',            reg.size() === 0);
reg.register({ ...VALID_VOICE });
check('registered voice is retrievable',    reg.get('voice.test')?.id === 'voice.test');
check('get() returns null for unknown id',  reg.get('voice.nobody') === null);
check('has() true for known id',            reg.has('voice.test'));
check('has() false for unknown id',         !reg.has('voice.nobody'));
check('list() returns all voices',          reg.list().length === 1);
check('list({ provider }) filters',         reg.list({ provider: 'elevenlabs' }).length === 1);
check('list({ provider: other }) empty',    reg.list({ provider: 'openai' }).length === 0);
throws('duplicate id throws',               () => reg.register({ ...VALID_VOICE }));
check('record is deep-frozen',              Object.isFrozen(reg.get('voice.test')));
check('stats() reports provider counts',    reg.stats().elevenlabs === 1);

// ============================================================
// 3. Built-in definitions
// ============================================================
section('Built-in definitions');

check('voice.george is registered',         voiceRegistry.has('voice.george'));
check('voice.sarah is registered',          voiceRegistry.has('voice.sarah'));
check('voice.adam is registered',           voiceRegistry.has('voice.adam'));
check('voice.viraj is registered',          voiceRegistry.has('voice.viraj'));
check('exactly 4 voices registered',        voiceRegistry.size() === 4);
check('george has correct voiceId',         voiceRegistry.get('voice.george')?.voiceId === 'JBFqnCBsd6RMkjVDRZzb');
check('sarah has correct voiceId',          voiceRegistry.get('voice.sarah')?.voiceId === 'EXAVITQu4vr4xnSDxMaL');
check('adam supports hinglish',             voiceRegistry.get('voice.adam')?.languages.includes('hinglish'));
check('viraj is library tier',              voiceRegistry.get('voice.viraj')?.tier === 'library');
check('viraj requiresPaidPlan is true',     voiceRegistry.get('voice.viraj')?.metadata.requiresPaidPlan === true);
check('george freeTierAvailable is true',   voiceRegistry.get('voice.george')?.metadata.freeTierAvailable === true);

// ============================================================
// 4. Resolver
// ============================================================
section('Resolver');

check('exact id resolves correctly',           resolveVoice('voice.george')?.id === 'voice.george');
check('voice.documentary → george',            resolveVoice('voice.documentary')?.id === 'voice.george');
check('voice.realestate → sarah',              resolveVoice('voice.realestate')?.id === 'voice.sarah');
check('voice.hindi → viraj',                   resolveVoice('voice.hindi')?.id === 'voice.viraj');
check('voice.hinglish → adam',                 resolveVoice('voice.hinglish')?.id === 'voice.adam');
check('voice.tech → adam',                     resolveVoice('voice.tech')?.id === 'voice.adam');
check('voice.calm → george',                   resolveVoice('voice.calm')?.id === 'voice.george');
check('unknown ref returns null',              resolveVoice('voice.xyz_unknown') === null);
check('null input returns null',               resolveVoice(null) === null);
check('backcompat: raw george voiceId → george',
  resolveVoice('JBFqnCBsd6RMkjVDRZzb')?.id === 'voice.george');
check('backcompat: raw sarah voiceId → sarah',
  resolveVoice('EXAVITQu4vr4xnSDxMaL')?.id === 'voice.sarah');
check('resolveByProviderId(elevenlabs, george) works',
  resolveByProviderId('elevenlabs', 'JBFqnCBsd6RMkjVDRZzb')?.id === 'voice.george');
check('resolveByProviderId(null, adam voiceId) works (no provider filter)',
  resolveByProviderId(null, 'pNInz6obpgDQGcFmaJgB')?.id === 'voice.adam');
check('resolveByProviderId unknown returns null',
  resolveByProviderId('elevenlabs', 'NOT_A_REAL_ID') === null);
check('SEMANTIC_VOICE_REFS is frozen',         Object.isFrozen(SEMANTIC_VOICE_REFS));

// ============================================================
// 5. Search
// ============================================================
section('Search');

check('search "british" returns george',
  searchVoices('british')[0]?.voice.id === 'voice.george');
check('search "narrator" returns results',
  searchVoices('narrator').length > 0);
check('search "realestate" returns sarah',
  searchVoices('realestate')[0]?.voice.id === 'voice.sarah');
check('freeTierOnly filter excludes viraj',
  searchVoices('', { freeTierOnly: true }).every((r) => r.voice.id !== 'voice.viraj'));
check('tier filter: library returns only viraj',
  searchVoices('', { tier: 'library' }).length === 1 &&
  searchVoices('', { tier: 'library' })[0].voice.id === 'voice.viraj');
check('language filter: hinglish returns adam',
  searchVoices('', { language: 'hinglish' }).some((r) => r.voice.id === 'voice.adam'));
check('empty query returns all active voices',
  searchVoices('', {}).length === voiceRegistry.list({ status: 'active' }).length);
check('impossible query returns empty array',  searchVoices('zzznotavoice').length === 0);
check('search is deterministic (same results on repeat)',
  JSON.stringify(searchVoices('narrator')) === JSON.stringify(searchVoices('narrator')));

// ============================================================
// 6. Intelligence — selectVoice policy chain
// ============================================================
section('Intelligence — selectVoice');

{
  const r = selectVoice();
  check('no args → engine fallback (george)',    r.voice?.id === 'voice.george');
  check('no args source is "language" (english default)',  r.source === 'language');
  check('result has trail array',                Array.isArray(r.trail));
  check('result carries voiceId (provider id)',  typeof r.voiceId === 'string');
}
check('language english → george',
  selectVoice({ language: 'english' }).voice?.id === 'voice.george');
check('language hinglish → adam',
  selectVoice({ language: 'hinglish' }).voice?.id === 'voice.adam');
check('mode normal + english → george',
  selectVoice({ mode: 'normal', language: 'english' }).voice?.id === 'voice.george');
check('mode realestate + english → sarah',
  selectVoice({ mode: 'realestate', language: 'english' }).voice?.id === 'voice.sarah');
check('mode realestate + hinglish → adam',
  selectVoice({ mode: 'realestate', language: 'hinglish' }).voice?.id === 'voice.adam');
check('mode normal + hindi → viraj',
  selectVoice({ mode: 'normal', language: 'hindi' }).voice?.id === 'voice.viraj');
check('user choice overrides mode default',
  selectVoice({ user: 'voice.sarah', mode: 'normal', language: 'english' }).voice?.id === 'voice.sarah');
check('user choice source is "user"',
  selectVoice({ user: 'voice.sarah' }).source === 'user');
check('project raw voiceId is resolved (backcompat)',
  selectVoice({ project: 'JBFqnCBsd6RMkjVDRZzb' }).voice?.id === 'voice.george');
check('project source is "project"',
  selectVoice({ project: 'JBFqnCBsd6RMkjVDRZzb' }).source === 'project');
check('user semantic ref works',
  selectVoice({ user: 'voice.documentary' }).voice?.id === 'voice.george');
check('unresolvable user falls through to mode default',
  selectVoice({ user: 'voice.xyz_nobody', mode: 'realestate', language: 'english' }).voice?.id === 'voice.sarah');
{
  const vocab = plannerVoiceVocabulary();
  check('plannerVoiceVocabulary returns array',       Array.isArray(vocab));
  check('plannerVoiceVocabulary is non-empty',         vocab.length > 0);
  check('plannerVoiceVocabulary contains voice.documentary', vocab.includes('voice.documentary'));
  check('plannerVoiceVocabulary is sorted',
    JSON.stringify(vocab) === JSON.stringify([...vocab].sort()));
}
check('MODE_VOICE_PREFERENCES is frozen',  Object.isFrozen(MODE_VOICE_PREFERENCES));
check('LANGUAGE_DEFAULTS is frozen',       Object.isFrozen(LANGUAGE_DEFAULTS));

// ============================================================
// 7. validateVoiceRegistry
// ============================================================
section('Validation');

{
  const report = validateVoiceRegistry();
  check('default registry passes validation',  report.ok);
  check('no errors in default registry',       report.errors.length === 0);
  check('info array is non-empty',             report.info.length > 0);
}
{
  const empty = createVoiceRegistry();
  const r = validateVoiceRegistry({ registry: empty });
  check('empty registry ok but warns',         r.ok && r.warnings.length > 0);
}
{
  // Duplicate provider voiceId → error
  const dup = createVoiceRegistry();
  const base = { ...VALID_VOICE, metadata: { freeTierAvailable: true, requiresPaidPlan: false } };
  dup.register({ ...base, id: 'voice.a', voiceId: 'SHARED_ID' });
  dup.register({ ...base, id: 'voice.b', voiceId: 'SHARED_ID' });
  const r = validateVoiceRegistry({ registry: dup });
  check('duplicate provider voiceId is reported as error', r.errors.length > 0);
}

// ============================================================
// 8. Integration seams
// ============================================================
section('Integration seams');

check('voiceForMode normal+english → george',    voiceForMode('normal', 'english')?.id === 'voice.george');
check('voiceForMode realestate+english → sarah', voiceForMode('realestate', 'english')?.id === 'voice.sarah');
check('voiceForMode normal+hinglish → adam',     voiceForMode('normal', 'hinglish')?.id === 'voice.adam');
check('voiceForLegacyId george voiceId → george',
  voiceForLegacyId('JBFqnCBsd6RMkjVDRZzb')?.id === 'voice.george');
check('voiceForLegacyId sarah voiceId → sarah',
  voiceForLegacyId('EXAVITQu4vr4xnSDxMaL')?.id === 'voice.sarah');
check('voiceForLegacyId unknown → null',         voiceForLegacyId('NOTREAL') === null);
check('requestVoice "narrator" returns results', requestVoice('narrator').length > 0);
check('plannerVoiceSeam returns array',          Array.isArray(plannerVoiceSeam()));

// ============================================================
// 9. listActiveVoices / voiceOptions
// ============================================================
section('Public helpers');

{
  const active = listActiveVoices();
  check('listActiveVoices returns 4 voices',   active.length === 4);
  check('all returned voices are active',      active.every((v) => v.status === 'active'));
}
{
  const opts = voiceOptions();
  check('voiceOptions has voices array',       Array.isArray(opts.voices) && opts.voices.length === 4);
  check('voiceOptions has providers array',    Array.isArray(opts.providers));
  check('voiceOptions has tiers array',        Array.isArray(opts.tiers));
  check('voiceOptions voices have no voiceId field (provider id not exposed)',
    opts.voices.every((v) => v.voiceId === undefined));
  check('voiceOptions voices have freeTierAvailable',
    opts.voices.every((v) => typeof v.freeTierAvailable === 'boolean'));
}

// ============================================================
// Final summary
// ============================================================
const total = passed + failed;
console.log(`\n${total} checks — ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailed checks:');
  errs.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}
console.log('Voice Engine smoke test PASS\n');
