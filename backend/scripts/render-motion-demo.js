// Render the Phase 2B Motion Engine validation demo (composition "MotionDemo")
// plus one verification still per segment. Run from backend/:
//   node scripts/render-motion-demo.js
// Outputs to data/motion-demo/.
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';

const outDir = path.join(process.cwd(), 'data', 'motion-demo');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'MotionDemo', inputProps: {} });

try {
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(outDir, 'motion-demo.mp4'),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r${pct}%`);
    },
  });
  console.log('\nDEMO RENDER OK:', path.join(outDir, 'motion-demo.mp4'));

  // Two stills per segment (early + late) so each motion's travel is visible.
  const seg = composition.durationInFrames / 4;
  const frames = [0, 1, 2, 3].flatMap((i) => [Math.round(i * seg + 8), Math.round(i * seg + seg - 12)]);
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
