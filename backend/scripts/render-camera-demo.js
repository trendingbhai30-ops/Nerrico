// Render the Phase 2C Advanced Camera Motion Library demo (composition
// "CameraDemo": rotate → orbit → push in → pull out → focus pull → shake)
// plus verification stills. Run from backend/:
//   node scripts/render-camera-demo.js
// Outputs to data/camera-demo/.
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';

const outDir = path.join(process.cwd(), 'data', 'camera-demo');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'CameraDemo', inputProps: {} });

try {
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(outDir, 'camera-demo.mp4'),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r${pct}%`);
    },
  });
  console.log('\nDEMO RENDER OK:', path.join(outDir, 'camera-demo.mp4'));

  // Two stills per segment (early + late) so each motion's travel is visible.
  const seg = composition.durationInFrames / 6;
  const frames = [0, 1, 2, 3, 4, 5].flatMap((i) => [Math.round(i * seg + 8), Math.round(i * seg + seg - 12)]);
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
