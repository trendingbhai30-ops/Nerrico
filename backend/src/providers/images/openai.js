import fs from 'node:fs';
import { env } from '../../config/env.js';

// OpenAI Images (gpt-image-1 / dall-e).
export const openai = {
  name: 'openai',
  available: () => !!env.openai.apiKey,
  async generate({ prompt, outPath }) {
    const model = env.openai.imageModel;
    const size = model.startsWith('dall-e') ? '1024x1792' : '1024x1536'; // portrait
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.openai.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size, n: 1 }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
    const item = (await res.json()).data?.[0];
    if (item?.b64_json) {
      fs.writeFileSync(outPath, Buffer.from(item.b64_json, 'base64'));
    } else if (item?.url) {
      const img = await fetch(item.url);
      if (!img.ok) throw new Error(`OpenAI image download ${img.status}`);
      fs.writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
    } else {
      throw new Error('OpenAI returned no image data');
    }
    return true;
  },
};
