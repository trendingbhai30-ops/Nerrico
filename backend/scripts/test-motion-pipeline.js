// Phase 2.5 integration test: scene planner → validation → motion registry →
// motion resolution → real Remotion render.
//
// Run from backend/:
//   node scripts/test-motion-pipeline.js                  # full run → data/motion-pipeline/current/
//   node scripts/test-motion-pipeline.js --stills-only X  # render fixture stills only → data/motion-pipeline/X/
//
// The stills-only mode exists so a pre-migration baseline can be captured and
// visually compared against post-migration output (grain noise aside, frames
// must be identical for the legacy fixture).
import fs from 'node:fs';
import path from 'node:path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { ensureBundle } from '../src/core/render.js';
import { validateShots } from '../src/core/scenes.js';
import { motionRegistry, resolveMotion, motionProgress } from '../remotion/motion/index.js';

let failures = 0;
let total = 0;
function check(name, cond) {
  total++;
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

const stillsOnly = process.argv.includes('--stills-only');
const outName = stillsOnly ? process.argv[process.argv.indexOf('--stills-only') + 1] || 'baseline' : 'current';

// ---------------------------------------------------------------------------
// Fixture: 24 words @ 0.5s each (12s), 4 shots of 6 words (3s per shot).
// Legacy path: shots carry only the old `camera` field (pre-2.5 projects).
// ---------------------------------------------------------------------------
const words = Array.from({ length: 24 }, (_, i) => ({
  word: `word${i}`,
  start: i * 0.5,
  end: i * 0.5 + 0.4,
}));
const durationSec = 12;

const legacyPlannerOutput = {
  shots: [
    { start: 0, end: 5, imagePrompt: 'p1', query: 'q1', icons: ['🏛️'], caption: 'In 2000', emphasis: ['2000'], camera: 'zoomIn' },
    { start: 6, end: 11, imagePrompt: 'p2', query: 'q2', icons: ['📰'], caption: 'the papers', emphasis: [], camera: 'panLeft' },
    { start: 12, end: 17, imagePrompt: 'p3', query: 'q3', icons: ['🖼️'], caption: 'a portrait', emphasis: [], camera: 'zoomOut' },
    { start: 18, end: 23, imagePrompt: 'p4', query: 'q4', icons: ['🌆'], caption: 'the city', emphasis: [], camera: 'panRight' },
  ],
};

function legacyScenes() {
  const scenes = validateShots(structuredClone(legacyPlannerOutput), words.length);
  // Designed kinds are settable via manual project.json edits (documented
  // workflow) — exercise the newspaper/framed camera paths (amp 0.55 / 0.5).
  scenes[1].kind = 'newspaper';
  scenes[1].headline = 'MARKET FALLS';
  scenes[1].accentWord = 'falls';
  scenes[2].kind = 'framed';
  return scenes;
}

// One mid-scene + one late frame per shot: motion travel must be visible
// between the pair, and pairs must match the baseline after migration.
const STILL_FRAMES = [45, 80, 135, 170, 225, 260, 315, 350];

async function renderFixtureStills(scenes, dir, tag) {
  fs.mkdirSync(dir, { recursive: true });
  const serveUrl = await ensureBundle();
  const inputProps = { audioUrl: null, words, scenes, durationSec, style: 'cinematic' };
  const composition = await selectComposition({ serveUrl, id: 'Short', inputProps });
  for (const f of STILL_FRAMES) {
    const out = path.join(dir, `${tag}-${String(f).padStart(3, '0')}.png`);
    await renderStill({ composition, serveUrl, output: out, inputProps, frame: f });
    console.log(out);
  }
}

const baseDir = path.join(process.cwd(), 'data', 'motion-pipeline');

if (stillsOnly) {
  await renderFixtureStills(legacyScenes(), path.join(baseDir, outName), 'legacy');
  process.exit(0);
}

// ===========================================================================
// Stage 1 — scene planner output → validateShots (the real validator).
// Valid motion presets pass; garbage never reaches the render.
// ===========================================================================
console.log('stage 1 — planner validation:');
const modernPlannerOutput = {
  shots: [
    { start: 0, end: 5, imagePrompt: 'p1', icons: ['🏛️'], caption: '', emphasis: [], motion: 'slowZoom' },
    { start: 6, end: 11, imagePrompt: 'p2', icons: ['📰'], caption: '', emphasis: [], motion: 'documentaryPan', transition: 'fade' },
    { start: 12, end: 17, imagePrompt: 'p3', icons: ['🖼️'], caption: '', emphasis: [], motion: 'doesNotExist', camera: 'zoomOut' },
    { start: 18, end: 23, imagePrompt: 'p4', icons: ['🌆'], caption: '', emphasis: [], motion: 'newsPush', transition: 'notATransition', effect: 'filmGrain' },
  ],
};
const validated = validateShots(structuredClone(modernPlannerOutput), words.length);
check('valid preset passes through', validated[0].motion === 'slowZoom');
check('valid transition passes through', validated[1].transition === 'fade');
check('unknown preset is stripped, never reaches render', validated[2].motion === null);
check('legacy camera survives as fallback', validated[2].camera === 'zoomOut');
check('unknown transition is stripped', validated[3].transition === null);
check('valid effect passes through', validated[3].effect === 'filmGrain');
check('legacy camera still auto-assigned when absent', ['zoomIn', 'zoomOut', 'panLeft', 'panRight'].includes(validated[0].camera));

// ===========================================================================
// Stage 2 — validated fields resolve through registry → config → timing.
// Exactly what the compositions do per scene, in pure Node.
// ===========================================================================
console.log('stage 2 — registry resolution:');
const m0 = resolveMotion(validated[0].motion, { category: 'camera' });
check('preset resolves to an implemented camera kind', m0.def?.status === 'implemented' && m0.category === 'camera');
check('timing engine produces progress for it', motionProgress(m0, 45, 30, 90) > 0 && motionProgress(m0, 200, 30, 90) === 1);
const t1 = resolveMotion({ category: 'transition', kind: validated[1].transition, durationInSeconds: 0.4 });
check('transition resolves with explicit duration', t1.def?.name === 'fade' && t1.durationInSeconds === 0.4);
const e3 = resolveMotion({ category: 'effect', kind: validated[3].effect });
check('effect resolves through the registry', e3.def?.name === 'filmGrain' && e3.def.status === 'implemented');
check('stripped motion resolves to disabled, not a crash', resolveMotion(validated[2].motion, { category: 'camera' }).def === null);
check('every registered preset resolves without throwing', motionRegistry.list('preset').every((p) => resolveMotion(p) !== null));

// ===========================================================================
// Stage 3 — real Remotion renders through the Short composition.
//   a) legacy fixture → data/motion-pipeline/current/  (compare vs baseline/)
//   b) preset fixture → data/motion-pipeline/presets/  (new path, must move)
// ===========================================================================
console.log('stage 3 — render (legacy fixture → current/):');
await renderFixtureStills(legacyScenes(), path.join(baseDir, 'current'), 'legacy');

console.log('stage 3 — render (motion-preset fixture → presets/):');
await renderFixtureStills(validated, path.join(baseDir, 'presets'), 'preset');

console.log('');
if (failures) {
  console.error(`${failures}/${total} FAILURE(S)`);
  process.exit(1);
}
console.log(`ALL ${total} PIPELINE CHECKS PASSED (+ stills rendered for visual compare)`);
process.exit(0);
