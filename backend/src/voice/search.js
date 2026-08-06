// Nerrico Voice Engine — search (Phase 5A).
//
// Deterministic ranked full-text search over the voice registry. Every call
// with the same query + registry state returns the same ordered result — no
// randomness, no per-run state. Mirrors the Asset Engine's searchRegistry().

import { voiceRegistry } from './registry.js';

/**
 * Score a single search term against one voice record.
 * Returns 0 if the term doesn't match at all.
 *
 * Field weights (additive per term, not max):
 *   id exact         100   displayName exact   90
 *   id substring      30   displayName substr  40
 *   tags exact        70   tags substring      30
 *   accent exact      55   accent substring    20
 *   languages exact   50
 *   provider exact    20
 *   tier exact        15
 *
 * @param {string} term  lowercased single token
 * @param {import('./schema.js').VoiceRecord} v
 */
function termScore(term, v) {
  let score = 0;

  const idLower = v.id.toLowerCase();
  if (idLower === term) score += 100;
  else if (idLower.includes(term)) score += 30;

  const nameLower = v.displayName.toLowerCase();
  if (nameLower === term) score += 90;
  else if (nameLower.includes(term)) score += 40;

  for (const tag of v.tags) {
    const t = tag.toLowerCase();
    if (t === term) { score += 70; break; }
    if (t.includes(term)) score += 30;
  }

  const accentLower = v.accent.toLowerCase();
  if (accentLower === term) score += 55;
  else if (accentLower.includes(term)) score += 20;

  for (const lang of v.languages) {
    if (lang.toLowerCase() === term) { score += 50; break; }
  }

  if (v.provider.toLowerCase() === term) score += 20;
  if (v.tier.toLowerCase() === term)     score += 15;
  if (v.gender && v.gender.toLowerCase() === term) score += 25;

  return score;
}

/** Normalise a query into lowercase tokens (split on whitespace, dots, slashes). */
function queryTerms(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[\s.,/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Search the voice registry.
 * AND-semantics: ALL terms must match (score > 0) for a record to appear.
 * Ties are broken alphabetically by id (stable, deterministic).
 *
 * @param {string} query
 * @param {{
 *   provider?: string,
 *   tier?: string,
 *   language?: string,
 *   gender?: string,
 *   freeTierOnly?: boolean,
 *   status?: string,
 *   limit?: number,
 *   registry?: ReturnType<import('./registry.js').createVoiceRegistry>
 * }} [opts]
 * @returns {{ voice: import('./schema.js').VoiceRecord, score: number }[]}
 */
export function searchVoices(query, opts = {}) {
  const {
    provider,
    tier,
    language,
    gender,
    freeTierOnly = false,
    status = 'active',
    limit = 20,
    registry = voiceRegistry,
  } = opts;

  const terms = queryTerms(query);

  let candidates = registry.list({ provider, tier, language, gender, status });

  if (freeTierOnly) {
    candidates = candidates.filter((v) => !v.metadata.requiresPaidPlan);
  }

  if (!terms.length) {
    // No query — return all candidates, sorted by id (deterministic).
    return candidates
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, limit)
      .map((voice) => ({ voice, score: 0 }));
  }

  const results = [];
  for (const voice of candidates) {
    let total = 0;
    let matched = true;
    for (const term of terms) {
      const s = termScore(term, voice);
      if (s === 0) { matched = false; break; }
      total += s;
    }
    if (matched) results.push({ voice, score: total });
  }

  results.sort((a, b) => b.score - a.score || a.voice.id.localeCompare(b.voice.id));
  return results.slice(0, limit);
}
