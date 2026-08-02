import fs from 'node:fs';
import { env } from '../../config/env.js';

// Stability AI (Stable Diffusion, https://platform.stability.ai).
export const stability = {
  name: 'stability',
  available: () => !!env.stability.apiKey,
  async generate({ prompt, outPath, seed }) {
    const model = env.stability.imageModel; // core | ultra | sd3
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('aspect_ratio', '9:16');
    form.append('output_format', 'png');
    form.append('seed', String(seed));
    const res = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.stability.apiKey}`, accept: 'image/*' },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Stability ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
    fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
    return true;
  },
};
