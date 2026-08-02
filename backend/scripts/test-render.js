// Reproduce the exact failed render for project d2fe791fdb84 outside the server.
import fs from 'node:fs';
import path from 'node:path';
import { renderShort } from '../src/core/render.js';

const id = 'd2fe791fdb84';
const dir = path.join(process.cwd(), 'data', 'projects', id);
const { words, durationSec } = JSON.parse(fs.readFileSync(path.join(dir, 'timing.json'), 'utf8'));
const scenes = JSON.parse(fs.readFileSync(path.join(dir, 'scenes.json'), 'utf8'));
for (const s of scenes) {
  if (s.type === 'photo' && s.image) s.src = `http://127.0.0.1:4000/api/projects/${id}/asset/${s.image}`;
}
try {
  await renderShort({
    inputProps: { audioUrl: `http://127.0.0.1:4000/api/projects/${id}/audio`, words, scenes, durationSec },
    outMp4: path.join(dir, 'video.mp4'),
    outPng: path.join(dir, 'thumbnail.png'),
    onProgress: (p) => { if (Math.round(p * 100) % 10 === 0) process.stdout.write(`\r${Math.round(p * 100)}%`); },
  });
  console.log('\nRENDER OK');
} catch (e) {
  console.error('\nRENDER FAILED:', e);
  process.exit(1);
}
