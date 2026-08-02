import { env } from '../config/env.js';
import { USER_AGENT, MAX_STOCK_ASPECT_RATIO } from '../config/constants.js';
import { downloadToFile } from '../utils/download.js';
import { createLogger } from '../utils/logger.js';
import { fetchCommonsImage } from './commons.js';

const log = createLogger('stock');

// Royalty-free stock photo chain (Priority 2 after AI generation):
//   Pexels → Pixabay (both need free keys in .env, skipped when absent)
//   → Openverse (no key) → Wikimedia Commons (no key).
// Returns { file, attribution } or null. Portrait images preferred — the
// cinematic frame is 9:16 and landscape crops lose too much.
// To add a provider: write fetchX(query, outPath) below and add it to the chain.

export async function fetchStockImage(query, outPath) {
  const providers = [fetchPexels, fetchPixabay, fetchOpenverse, fetchCommons];
  for (const provider of providers) {
    try {
      const result = await provider(query, outPath);
      if (result) return result;
    } catch (e) {
      log.warn(`${provider.name} failed:`, e.message);
    }
  }
  return null;
}

async function fetchPexels(query, outPath) {
  const key = env.pexels.apiKey;
  if (!key) return null;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  for (const photo of data.photos || []) {
    if (await downloadToFile(photo.src?.large2x || photo.src?.large, outPath)) {
      return {
        file: outPath,
        attribution: { source: 'Pexels', artist: photo.photographer, descriptionUrl: photo.url, license: 'Pexels License' },
      };
    }
  }
  return null;
}

async function fetchPixabay(query, outPath) {
  const key = env.pixabay.apiKey;
  if (!key) return null;
  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&orientation=vertical&image_type=photo&per_page=5&safesearch=true`
  );
  if (!res.ok) return null;
  const data = await res.json();
  for (const hit of data.hits || []) {
    if (await downloadToFile(hit.largeImageURL, outPath)) {
      return {
        file: outPath,
        attribution: { source: 'Pixabay', artist: hit.user, descriptionUrl: hit.pageURL, license: 'Pixabay License' },
      };
    }
  }
  return null;
}

async function fetchOpenverse(query, outPath) {
  // Anonymous access is allowed (rate-limited). Commercial licenses only.
  const res = await fetch(
    'https://api.openverse.org/v1/images/?' +
      `q=${encodeURIComponent(query)}&license_type=commercial&per_page=8&filter_dead=true`,
    { headers: { 'user-agent': USER_AGENT } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const results = (data.results || []).filter((r) => {
    if (!r.url || !r.width || !r.height) return false;
    if (r.width < 600 || r.height < 500) return false;
    const ratio = r.width / r.height;
    return ratio < MAX_STOCK_ASPECT_RATIO && ratio > 1 / MAX_STOCK_ASPECT_RATIO;
  });
  // Portrait first — they fill the 9:16 frame without heavy cropping.
  results.sort((a, b) => a.width / a.height - b.width / b.height);
  for (const r of results) {
    if (await downloadToFile(r.url, outPath, { headers: { 'user-agent': USER_AGENT } })) {
      return {
        file: outPath,
        attribution: { source: 'Openverse', artist: r.creator || null, descriptionUrl: r.foreign_landing_url, license: r.license },
      };
    }
  }
  return null;
}

async function fetchCommons(query, outPath) {
  const result = await fetchCommonsImage(query, outPath);
  return result ? { file: outPath, attribution: { source: 'Wikimedia Commons', ...result.attribution } } : null;
}
