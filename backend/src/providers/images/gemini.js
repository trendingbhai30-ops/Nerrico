import fs from 'node:fs';
import { env } from '../../config/env.js';

// Gemini image generation (AI Studio). NOTE (2026-08-01): the key is valid but
// Google's free tier has 0 quota/day for all image models — needs billing.
export const gemini = {
  name: 'gemini',
  available: () => !!env.gemini.apiKey,
  async generate({ prompt, outPath }) {
    const model = env.gemini.imageModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.gemini.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '9:16' },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    }
    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error('Gemini returned no image data');
    fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'));
    return true;
  },
};
