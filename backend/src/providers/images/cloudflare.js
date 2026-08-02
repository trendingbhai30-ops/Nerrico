import fs from 'node:fs';
import { env } from '../../config/env.js';
import { MIN_IMAGE_BYTES } from '../../config/constants.js';

// Cloudflare Workers AI (free tier: 10k neurons/day).
export const cloudflare = {
  name: 'cloudflare',
  available: () => !!(env.cloudflare.apiToken && env.cloudflare.accountId),
  async generate({ prompt, outPath, seed, width, height }) {
    const model = env.cloudflare.imageModel;
    const url = `https://api.cloudflare.com/client/v4/accounts/${env.cloudflare.accountId}/ai/run/${model}`;
    // flux-1-schnell takes prompt/steps/seed only (fixed square output);
    // the SD-family models accept width/height directly.
    const body = model.includes('flux')
      ? { prompt, steps: 8, seed }
      : { prompt, width, height, seed, num_steps: 20 };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.cloudflare.apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Cloudflare ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
    const type = res.headers.get('content-type') || '';
    let buf;
    if (type.includes('json')) {
      const data = await res.json();
      if (!data.result?.image) throw new Error('Cloudflare returned no image data');
      buf = Buffer.from(data.result.image, 'base64');
    } else {
      buf = Buffer.from(await res.arrayBuffer());
    }
    if (buf.length < MIN_IMAGE_BYTES) throw new Error('Cloudflare image suspiciously small');
    fs.writeFileSync(outPath, buf);
    return true;
  },
};
