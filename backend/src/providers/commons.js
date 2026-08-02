import fs from 'node:fs';
import { USER_AGENT, MAX_STOCK_ASPECT_RATIO, MIN_IMAGE_BYTES } from '../config/constants.js';

/**
 * Search Wikimedia Commons for a photo matching `query` and download it.
 * Commons search ANDs every term, so an over-specific query ("Malcom McLean
 * portrait") returns nothing — retry with trailing words dropped until a
 * usable image turns up. Returns { file, attribution } or null.
 */
export async function fetchCommonsImage(query, outFile) {
  const terms = query.trim().split(/\s+/);
  const tokens = terms.filter((t) => t.length >= 4).map((t) => t.toLowerCase());
  for (let n = terms.length; n >= Math.min(terms.length, 2); n--) {
    // Relaxed retries match looser, so a result that shares no words with the
    // query is likely garbage — better to return nothing (caller falls back
    // to a text scene) than to show an unrelated image.
    const relaxed = n < terms.length;
    const result = await searchOnce(terms.slice(0, n).join(' '), outFile, relaxed ? tokens : null);
    if (result) return result;
  }
  return null;
}

async function searchOnce(query, outFile, requiredTokens) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=8' +
    `&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}` +
    '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200';

  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {});
  if (!pages.length) return null;

  // Prefer results in search-rank order; skip tiny images, SVG logos, PDFs,
  // extreme panoramas/strips (they crop terribly into the portrait photo
  // frame), and files whose name suggests line art rather than a photo.
  const NOT_A_PHOTO = /drawing|diagram|sketch|map|logo|flag|coat of arms|emblem|seal|icon|chart|plan\b/i;
  pages.sort((a, b) => a.index - b.index);
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!/^image\/(jpeg|png)$/.test(info.mime)) continue;
    if (info.width < 500 || info.height < 400) continue;
    if (info.width / info.height > MAX_STOCK_ASPECT_RATIO || info.height / info.width > MAX_STOCK_ASPECT_RATIO) continue;
    if (NOT_A_PHOTO.test(page.title)) continue;
    if (requiredTokens) {
      // Prefix match (first 5 chars) tolerates spelling variants like
      // "Malcom" vs "Malcolm" while still rejecting unrelated results.
      const title = page.title.toLowerCase();
      const hits = requiredTokens.filter((t) => title.includes(t.slice(0, 5))).length;
      if (hits < Math.min(2, requiredTokens.length)) continue;
    }
    const src = info.thumburl || info.url;
    try {
      const img = await fetch(src, { headers: { 'user-agent': USER_AGENT } });
      if (!img.ok) continue;
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length < MIN_IMAGE_BYTES) continue;
      fs.writeFileSync(outFile, buf);
      const meta = info.extmetadata || {};
      return {
        file: outFile,
        attribution: {
          title: page.title,
          artist: stripHtml(meta.Artist?.value),
          license: meta.LicenseShortName?.value || null,
          descriptionUrl: info.descriptionurl || null,
        },
      };
    } catch {
      continue;
    }
  }
  return null;
}

function stripHtml(s) {
  return s ? s.replace(/<[^>]*>/g, '').trim().slice(0, 200) : null;
}
