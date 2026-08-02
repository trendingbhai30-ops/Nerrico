// Smoke-test the image provider abstraction.
//   node scripts/test-imageproviders.js            -> test the configured chain
//   node scripts/test-imageproviders.js cloudflare -> test one provider directly
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { PROVIDERS, resolveChain } from '../src/providers/images/index.js';
import { generateImage } from '../src/providers/images/index.js';

const outDir = path.resolve(import.meta.dirname, '..', 'data');
const prompt =
  'A weathered 1990s video rental store at dusk, neon sign glowing, empty parking lot';

const only = process.argv[2];
if (only) {
  const p = PROVIDERS[only];
  if (!p) throw new Error(`Unknown provider "${only}". Known: ${Object.keys(PROVIDERS).join(', ')}`);
  console.log(`available: ${p.available()}`);
  const out = path.join(outDir, `test-${only}.png`);
  const t = Date.now();
  await p.generate({ prompt, outPath: out, seed: 3, width: 1080, height: 1920 });
  console.log(`OK ${out} (${fs.statSync(out).size} bytes, ${((Date.now() - t) / 1000).toFixed(1)}s)`);
} else {
  console.log('chain:', resolveChain().join(' -> '));
  const out = path.join(outDir, 'test-chain.png');
  const t = Date.now();
  const ok = await generateImage(prompt, out, { seed: 3 });
  console.log(ok ? `OK ${out} (${fs.statSync(out).size} bytes, ${((Date.now() - t) / 1000).toFixed(1)}s)` : 'FAILED');
}
