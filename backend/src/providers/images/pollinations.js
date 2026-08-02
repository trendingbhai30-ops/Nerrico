import fs from 'node:fs';
import { MIN_AI_IMAGE_BYTES, POLLINATIONS_TIMEOUT_MS } from '../../config/constants.js';

// Pollinations.ai — free, keyless, flux model. Always available as last resort.
export const pollinations = {
  name: 'pollinations',
  available: () => true,
  async generate({ prompt, outPath, seed, width, height }) {
    // Deterministic seed per shot so a re-render reuses the same image.
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1400))}` +
      `?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed + 7}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POLLINATIONS_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Pollinations ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) throw new Error(`Pollinations returned ${type}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < MIN_AI_IMAGE_BYTES) throw new Error('Pollinations image suspiciously small');
      fs.writeFileSync(outPath, buf);
      return true;
    } finally {
      clearTimeout(timer);
    }
  },
};
