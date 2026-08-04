// Nerrico Asset Engine — local search.
//
// Deterministic ranked search over registered assets. Multi-term queries are
// AND-semantics (every term must match SOME field); each term contributes its
// best field score and the total ranks the result. Ties break on id so the
// ordering is stable across runs — a hard requirement for the resolver, which
// takes the top hit.

/**
 * Field weights: exact > prefix > substring; tags outrank keywords outrank id
 * fragments. A term's score SUMS its best hit per field, so an asset matching
 * on both name and tag ("moneybag" for "money") outranks a tag-only match —
 * max-across-fields would leave such ties to the alphabetical tie-break.
 */
function termScore(term, asset) {
  let total = 0;
  if (asset.id === term) total += 100;
  else if (asset.id.includes(term)) total += 30;
  if (asset.name === term) total += 90;
  else if (asset.name.startsWith(term)) total += 60;
  else if (asset.name.includes(term)) total += 40;
  let bestTag = 0;
  for (const tag of asset.tags) {
    if (tag === term) bestTag = Math.max(bestTag, 70);
    else if (tag.startsWith(term)) bestTag = Math.max(bestTag, 35);
    else if (tag.includes(term)) bestTag = Math.max(bestTag, 25);
  }
  let bestKw = 0;
  for (const kw of asset.keywords) {
    if (kw === term) bestKw = Math.max(bestKw, 55);
    else if (kw.includes(term)) bestKw = Math.max(bestKw, 20);
  }
  total += bestTag + bestKw;
  if (asset.category === term) total += 15;
  if (asset.type === term) total += 10;
  return total;
}

/** Query string → lowercase terms. Dots/whitespace split; dashes survive (they appear in names). */
export function queryTerms(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[\s.,/]+/)
    .filter(Boolean);
}

/**
 * @param {ReturnType<import('./registry.js').createAssetRegistry>} registry
 * @param {string} query
 * @param {{category?: string, type?: string, limit?: number}} [opts]
 * @returns {{asset: import('./schema.js').AssetRecord, score: number}[]} ranked, best first
 */
export function searchRegistry(registry, query, opts = {}) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const limit = opts.limit ?? 20;
  const results = [];
  for (const asset of registry.list({ category: opts.category, type: opts.type })) {
    let total = 0;
    let matched = true;
    for (const term of terms) {
      const s = termScore(term, asset);
      if (s === 0) {
        matched = false;
        break;
      }
      total += s;
    }
    if (matched) results.push({ asset, score: total });
  }
  results.sort((a, b) => b.score - a.score || a.asset.id.localeCompare(b.asset.id));
  return results.slice(0, limit);
}
