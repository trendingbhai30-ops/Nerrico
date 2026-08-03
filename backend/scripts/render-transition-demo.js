// Render the Phase 2D-1 Motion Transition Library demo (composition
// "TransitionDemo": slide → whip → flash → paperReveal → morph → heroReveal)
// plus verification stills. Run from backend/:
//   node scripts/render-transition-demo.js
// Outputs to data/transition-demo/.
import fs from 'node:fs';
import path from 'node:path';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';

const outDir = path.join(process.cwd(), 'data', 'transition-demo');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'TransitionDemo', inputProps: {} });

try {
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(outDir, 'transition-demo.mp4'),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r${pct}%`);
    },
  });
  console.log('\nDEMO RENDER OK:', path.join(outDir, 'transition-demo.mp4'));

  // Three stills per segment (early / mid-transition / settled) — transitions
  // are fast, so the mid frame is where the state fields actually show.
  const seg = composition.durationInFrames / 6;
  const frames = [0, 1, 2, 3, 4, 5].flatMap((i) => [
    Math.round(i * seg + 3),
    Math.round(i * seg + 12),
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
