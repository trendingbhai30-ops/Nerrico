// Nerrico Voice Engine — demo (Phase 5A).
// Run: node scripts/demo-voice.js  (from backend/)
//
// Human-readable tour of the Voice Engine: registry stats, resolver,
// selectVoice policy chain, search, and validation report.

import {
  voiceRegistry,
  resolveVoice,
  searchVoices,
  validateVoiceRegistry,
  selectVoice,
  plannerVoiceVocabulary,
  SEMANTIC_VOICE_REFS,
  LANGUAGE_DEFAULTS,
  MODE_VOICE_PREFERENCES,
  listActiveVoices,
  voiceOptions,
  voiceForMode,
  voiceForLegacyId,
} from '../src/voice/index.js';

const hr = (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);

// ─── Registry overview ────────────────────────────────────────
hr('Registry overview');
const stats = voiceRegistry.stats();
console.log('  Providers:', stats);
console.log('  Total voices:', voiceRegistry.size());
for (const v of listActiveVoices()) {
  const free = v.metadata.freeTierAvailable ? '✓ free' : '✗ paid';
  console.log(`  [${free}] ${v.id.padEnd(18)} ${v.displayName.padEnd(8)} ${v.tier.padEnd(14)} ${v.languages.join(', ')}`);
}

// ─── Resolver: semantic refs ──────────────────────────────────
hr('Resolver — semantic reference lookup');
const DEMO_REFS = [
  'voice.documentary', 'voice.realestate', 'voice.tech',
  'voice.hindi', 'voice.hinglish', 'voice.calm', 'voice.energetic',
];
for (const ref of DEMO_REFS) {
  const v = resolveVoice(ref);
  console.log(`  ${ref.padEnd(24)} → ${v ? `${v.id} (${v.displayName})` : 'null'}`);
}

// ─── Resolver: backwards compat (raw ElevenLabs voiceIds) ────
hr('Resolver — backwards compat (raw provider voiceId)');
const RAW_IDS = [
  'JBFqnCBsd6RMkjVDRZzb',   // George
  'EXAVITQu4vr4xnSDxMaL',   // Sarah
  'pNInz6obpgDQGcFmaJgB',   // Adam
  'pHG3exaXQt8bmTWbaVOs',   // Viraj
];
for (const id of RAW_IDS) {
  const v = voiceForLegacyId(id);
  console.log(`  ${id} → ${v ? `${v.id} (${v.displayName})` : 'null'}`);
}

// ─── selectVoice policy chain ─────────────────────────────────
hr('selectVoice — policy chain');
const CASES = [
  { desc: 'no args (engine fallback)',           opts: {} },
  { desc: 'language: english',                   opts: { language: 'english' } },
  { desc: 'language: hinglish',                  opts: { language: 'hinglish' } },
  { desc: 'language: hindi',                     opts: { language: 'hindi' } },
  { desc: 'mode: normal + english',              opts: { mode: 'normal',     language: 'english' } },
  { desc: 'mode: realestate + english',          opts: { mode: 'realestate', language: 'english' } },
  { desc: 'mode: realestate + hinglish',         opts: { mode: 'realestate', language: 'hinglish' } },
  { desc: 'user: voice.sarah override',          opts: { user: 'voice.sarah', mode: 'normal', language: 'english' } },
  { desc: 'project: raw voiceId (backcompat)',   opts: { project: 'JBFqnCBsd6RMkjVDRZzb' } },
];
for (const { desc, opts } of CASES) {
  const r = selectVoice(opts);
  console.log(`  [${r.source.padEnd(8)}] ${r.voice?.id.padEnd(18) ?? 'null'.padEnd(18)} — ${desc}`);
}

// ─── Search ───────────────────────────────────────────────────
hr('Search');
for (const [query, opts] of [
  ['narrator',   {}],
  ['british',    {}],
  ['hinglish',   {}],
  ['',           { freeTierOnly: true }],
  ['',           { tier: 'library' }],
]) {
  const label = query ? `"${query}"` : `(all, ${JSON.stringify(opts)})`;
  const hits = searchVoices(query, opts);
  console.log(`  ${label.padEnd(30)} → ${hits.map((h) => `${h.voice.id}(${h.score})`).join(', ') || 'no results'}`);
}

// ─── Planner vocabulary ───────────────────────────────────────
hr('Planner voice vocabulary');
const vocab = plannerVoiceVocabulary();
console.log(`  ${vocab.length} semantic refs:\n  ${vocab.join('\n  ')}`);

// ─── Validation report ────────────────────────────────────────
hr('Registry validation');
const report = validateVoiceRegistry();
console.log('  ok     :', report.ok);
console.log('  errors :', report.errors.length ? report.errors : '(none)');
console.log('  warnings:', report.warnings.length ? report.warnings : '(none)');
console.log('  info   :');
report.info.forEach((l) => console.log(`    ${l}`));

console.log('\nDemo complete.\n');
