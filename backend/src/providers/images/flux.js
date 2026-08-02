import fs from 'node:fs';
import { env } from '../../config/env.js';

// FLUX (Black Forest Labs, https://api.bfl.ai) — async task API with polling.
export const flux = {
  name: 'flux',
  available: () => !!env.bfl.apiKey,
  async generate({ prompt, outPath, seed, width, height }) {
    const model = env.bfl.model;
    const round32 = (n) => Math.max(256, Math.round(n / 32) * 32); // BFL requires multiples of 32
    const res = await fetch(`https://api.bfl.ai/v1/${model}`, {
      method: 'POST',
      headers: { 'x-key': env.bfl.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, seed, width: round32(width * 0.7), height: round32(height * 0.7) }),
    });
    if (!res.ok) {
      throw new Error(`BFL ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
    const { id, polling_url: pollingUrl } = await res.json();
    if (!id) throw new Error('BFL returned no task id');
    const pollUrl = pollingUrl || `https://api.bfl.ai/v1/get_result?id=${id}`;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(pollUrl, { headers: { 'x-key': env.bfl.apiKey } });
      if (!poll.ok) continue;
      const status = await poll.json();
      if (status.status === 'Ready') {
        const img = await fetch(status.result.sample);
        if (!img.ok) throw new Error(`BFL image download ${img.status}`);
        fs.writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
        return true;
      }
      if (status.status === 'Error' || status.status === 'Content Moderated') {
        throw new Error(`BFL generation failed: ${status.status}`);
      }
    }
    throw new Error('BFL generation timed out');
  },
};
