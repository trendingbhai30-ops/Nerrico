// Render the Phase 2D-2 Motion Effect Library demo (composition
// "EffectsDemo": blur → glow → noise → dust → embers → snow → vignette)
// plus verification stills. Run from backend/:
//   node scripts/render-effects-demo.js
// Outputs to data/effects-demo/.
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';

const outDir = path.join(process.cwd(), 'data', 'effects-demo');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'EffectsDemo', inputProps: {} });

try {
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(outDir, 'effects-demo.mp4'),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r${pct}%`);
    },
  });
  console.log('\nDEMO RENDER OK:', path.join(outDir, 'effects-demo.mp4'));

  // Three stills per segment (early / mid / late) — the ramped effects (blur,
  // glow, vignette) differ across the trio, the constant ones (noise,
  // particles) prove drift/animation between frames.
  const seg = composition.durationInFrames / 7;
  const frames = [0, 1, 2, 3, 4, 5, 6].flatMap((i) => [
    Math.round(i * seg + 3),
    Math.round(i * seg + seg / 2),
    Math.round(i * seg + seg - 12),
  ]);
  for (const f of frames) {
    const out = path.join(outDir, `demo-frame-${String(f).padStart(3, '0')}.png`);
    await renderStill({ composition, serveUrl, output: out, inputProps: {}, frame: f });
    console.log(out);
  }
} catch (e) {
  console.error('\nDEMO RENDER FAILED:', e);
  process.exit(1);
}
process.exit(0);
