import fs from 'node:fs';
import { MIN_IMAGE_BYTES } from '../config/constants.js';

/**
 * Download a URL to a file. Returns true on success, null when the response
 * is not OK or the payload is suspiciously small (error page / placeholder).
 */
export async function downloadToFile(url, outPath, { headers = {}, minBytes = MIN_IMAGE_BYTES } = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < minBytes) return null;
  fs.writeFileSync(outPath, buf);
  return true;
}
