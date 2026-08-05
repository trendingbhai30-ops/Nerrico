// Render project d2fe791fdb84 WITH a Phase 4C asset timeline (music bed +
// one SFX accent) and verify the layers are audible in the output.
// Run from backend/ with the server on :4000 (scene images load over HTTP):
//   node scripts/test-render-assets.js
//
// The voiceover ends 1s before the video does — a window where only the music
// bed can be sounding. Digital silence there means the audio layer is broken.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderShort } from '../src/core/render.js';
import { initAssetEngine, buildAssetTimeline, provideSfx } from '../src/assets/index.js';

const id = 'd2fe791fdb84';
const dir = path.join(process.cwd(), 'data', 'projects', id);
const { words, durationSec } = JSON.parse(fs.readFileSync(path.join(dir, 'timing.json'), 'utf8'));
const scenes = JSON.parse(fs.readFileSync(path.join(dir, 'scenes.json'), 'utf8'));
for (const s of scenes) {
  if (s.type === 'photo' && s.image) s.src = `http://127.0.0.1:4000/api/projects/${id}/asset/${s.image}`;
}

await initAssetEngine();
const baseUrl = 'http://127.0.0.1:4000';
const assets = buildAssetTimeline({ scenes, words, durationSec, style: null, projectMusic: 'auto', baseUrl });
// This legacy vox project has no motion/sfx fields — inject one accent so the
// SFX path renders too.
assets.sfx = [provideSfx('sfx.click', { baseUrl, start: 1 })].filter(Boolean);
console.log('timeline:', JSON.stringify({ music: assets.music.map((m) => m.assetId), sfx: assets.sfx.map((s) => s.assetId) }));

const outMp4 = path.join(dir, 'video-assets-test.mp4');
await renderShort({
  inputProps: { audioUrl: `${baseUrl}/api/projects/${id}/audio`, words, scenes, durationSec, assets },
  outMp4,
  outPng: path.join(dir, 'thumbnail-assets-test.png'),
  onProgress: (p) => { if (Math.round(p * 100) % 10 === 0) process.stdout.write(`\r${Math.round(p * 100)}%`); },
});
console.log('\nRENDER OK — analyzing the music-only tail…');

// RMS over the 0.7s after the voiceover ends (before the fade-out finishes).
// Remotion's slim ffmpeg has no volumedetect filter, so decode the tail to
// PCM and measure in Node. shell:true mangles quoted spaces on Windows
// ("Naitik Sharma"), so use relative paths from cwd.
const rel = path.relative(process.cwd(), outMp4).replaceAll('\\', '/');
const tailWav = rel.replace(/\.mp4$/, '-tail.wav');
const probe = spawnSync('npx', [
  'remotion', 'ffmpeg', '-y', '-ss', String(durationSec + 0.1), '-t', '0.7', '-i', rel,
  '-vn', '-acodec', 'pcm_s16le', tailWav,
], { shell: true, encoding: 'utf8' });
if (probe.status !== 0) {
  console.error('FAIL — could not extract the tail audio:\n', probe.stderr?.slice(-500));
  process.exit(1);
}
const wav = fs.readFileSync(path.join(process.cwd(), tailWav));
const dataAt = wav.indexOf(Buffer.from('data')) + 8; // start of PCM samples
let sum = 0;
let n = 0;
for (let i = dataAt; i + 1 < wav.length; i += 2) {
  const s = wav.readInt16LE(i) / 32768;
  sum += s * s;
  n++;
}
const rms = 20 * Math.log10(Math.sqrt(sum / n) || 1e-10);
console.log(`tail RMS: ${rms.toFixed(1)} dBFS over ${n} samples`);
if (!Number.isFinite(rms) || rms < -70) {
  console.error('FAIL — the music bed is not audible in the voiceover-free tail');
  process.exit(1);
}
console.log('MUSIC LAYER AUDIBLE — Phase 4C render integration OK');
