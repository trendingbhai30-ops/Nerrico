// Regression check for carousel stills: renders a 4-slide carousel in every
// style and fails if any two slides come out identical (the renderStill
// resolved-props bug) or a file is missing. Run from backend/: node scripts/test-slides.js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSlides } from '../src/core/render.js';
import { brandingProps } from '../src/content/branding.js';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(backendDir); // keep Remotion's chrome-headless-shell cache in backend/node_modules

const slides = [
  { role: 'hook', heading: 'Flat lene se pehle ye 3 cheezein check karo', body: 'Warna lakhs ka nuksaan ho sakta hai' },
  { role: 'content', heading: '1. Carpet area, not built-up', body: 'Builder jo area bolta hai usme walls aur lobby bhi hoti hai. Registry hamesha carpet area par karo.' },
  { role: 'content', heading: '2. RERA registration', body: 'Project ka RERA number MahaRERA site par check karo — possession date aur complaints wahin dikhti hain.' },
  { role: 'cta', heading: '', body: '' },
];

const branding = brandingProps(4000);
let failed = false;

for (const style of ['vox', 'luxury']) {
  const outputs = await renderSlides({
    slides,
    style,
    branding,
    outPath: (i) => path.join(backendDir, `test-slide-${style}-${i + 1}.png`),
    onProgress: (done, total) => console.log(`  ${style}: slide ${done}/${total}`),
  });
  const hashes = outputs.map((f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'));
  const unique = new Set(hashes).size;
  console.log(`${style}: ${outputs.length} slides, ${unique} unique`);
  if (unique !== outputs.length) {
    console.error(`  FAIL: duplicate slides in ${style} — resolved-props bug is back`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
