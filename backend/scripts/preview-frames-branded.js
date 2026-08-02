// Usage: node scripts/preview-frames-branded.js <projectId> <frame> [frame...]
// Same as preview-frames.js but passes style + branding, matching the real pipeline.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';
import { artifactPath, getProject } from '../src/core/store.js';
import { brandingProps } from '../src/content/branding.js';
import { getMode } from '../src/content/modes.js';

const PORT = process.env.PORT || 4000;
const [id, ...frames] = process.argv.slice(2);
const p = getProject(id);
const { words, durationSec } = JSON.parse(fs.readFileSync(artifactPath(id, 'timing.json'), 'utf8'));
const scenes = JSON.parse(fs.readFileSync(artifactPath(id, 'scenes.json'), 'utf8'));
const branding = getMode(p.mode)?.branded ? brandingProps(PORT) : null;
const inputProps = { audioUrl: null, words, scenes, durationSec, style: p.style, branding };

const serveUrl = await ensureBundle();
const composition = await selectComposition({ serveUrl, id: 'Short', inputProps });
console.log('durationInFrames:', composition.durationInFrames);
for (const f of frames.map(Number)) {
  const frame = Math.min(f, composition.durationInFrames - 1);
  const out = path.join(process.cwd(), `preview-${id}-${frame}.png`);
  await renderStill({ composition, serveUrl, output: out, inputProps, frame });
  console.log(out);
}
process.exit(0);
