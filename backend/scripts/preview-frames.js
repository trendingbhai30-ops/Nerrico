// Usage: node scripts/preview-frames.js <projectId> <frame> [frame...]
// Renders still frames from a finished project's composition for visual inspection.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';
import { artifactPath } from '../src/core/store.js';

const [id, ...frames] = process.argv.slice(2);
const { words, durationSec } = JSON.parse(fs.readFileSync(artifactPath(id, 'timing.json'), 'utf8'));
const scenes = JSON.parse(fs.readFileSync(artifactPath(id, 'scenes.json'), 'utf8'));
const inputProps = { audioUrl: null, words, scenes, durationSec };

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'Short', inputProps });
for (const f of frames.map(Number)) {
  const out = path.join(process.cwd(), `preview-${id}-${f}.png`);
  await renderStill({ composition, serveUrl, output: out, inputProps, frame: Math.min(f, composition.durationInFrames - 1) });
  console.log(out);
}
process.exit(0);
