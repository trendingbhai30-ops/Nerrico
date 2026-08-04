// Smoke test for the Nerrico Style Bible — Phase 3 contracts.
// Run from backend/:  node scripts/test-stylebible.js
// Pure Node, no Remotion/browser needed (definitions are structured data;
// the only React-free consumer exercised here is the shot planner prompt).

import {
  styleBible,
  validateStyleDefinition,
  getVisualStyle,
  resolveVisualStyle,
  defaultVisualStyle,
  visualStyleOptions,
  composeImagePrompt,
} from '../src/content/stylebible/index.js';
import { shotsPrompt } from '../src/content/prompts.js';
import { motionRegistry, resolveMotion } from '../remotion/motion/index.js';

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
function throws(fn, match = null) {
  try {
    fn();
    return false;
  } catch (e) {
    return match ? String(e.message).includes(match) : true;
  }
}

// A minimal VALID definition to mutate in schema tests. Kept deliberately
// small: one implemented preset per category, no self-contradictions.
function validDef() {
  return {
    name: 'test-style',
    displayName: 'Test Style',
    description: 'a style that exists only inside this smoke test',
    status: 'active',
    renderStyle: 'cinematic',
    philosophy: 'test philosophy',
    composition: ['one rule'],
    framing: ['one rule'],
    lighting: ['one rule'],
    forbidden: ['embedded text'],
    cameraBehaviour: 'slow and steady',
    motion: {
      pace: 'slow',
      cameraPresets: ['slowZoom'],
      transitions: ['fade'],
      effects: ['filmGrain'],
      transitionFrequency: '1 in 3 shots',
      effectFrequency: 'rarely',
    },
    colorPalette: { description: 'dark', tones: ['near-black'], accent: 'red' },
    typography: { captionStyle: 'serif fragments', rules: ['0-6 words'] },
    imagePrompt: {
      medium: 'photorealistic film still',
      prefix: 'cinematic still',
      suffix: 'moody grade',
      vocabulary: ['dramatic portrait'],
      rules: ['one image only'],
    },
    consistency: { rules: ['one film'], promptAnchors: ['dark cinematic grade'] },
  };
}

// --- registry -----------------------------------------------------------------
console.log('registry:');
check('11 styles registered (9 active + 2 future)', styleBible.list().length === 11);
check('9 active styles', styleBible.listActive().length === 9);
check('future styles registered but not active', styleBible.has('pixar-style') && styleBible.has('anime') && !styleBible.listActive().includes('pixar-style') && !styleBible.listActive().includes('anime'));
check('production defaults registered', ['cinematic', 'paper-collage', 'luxury'].every((n) => styleBible.has(n)));
check('cinematic family registered', ['documentary', 'ai-documentary', 'history', 'finance', 'modern-tech', 'minimal'].every((n) => styleBible.has(n)));
check('get() returns frozen defs', Object.isFrozen(styleBible.get('cinematic')));
check('nested objects frozen too', Object.isFrozen(styleBible.get('cinematic').motion) && Object.isFrozen(styleBible.get('cinematic').imagePrompt.vocabulary));
check('unknown name → null', styleBible.get('vaporwave') === null);
check('getVisualStyle is the same lookup', getVisualStyle('history') === styleBible.get('history'));
check('duplicate registration throws', throws(() => styleBible.register(styleBible.get('cinematic')), 'duplicate'));

// --- schema validation ----------------------------------------------------------
console.log('schema:');
check('valid definition passes', !throws(() => validateStyleDefinition(validDef())));
check('non-object rejected', throws(() => validateStyleDefinition(null)));
check('bad name rejected (kebab-case only)', throws(() => validateStyleDefinition({ ...validDef(), name: 'Test Style' }), 'kebab-case'));
check('missing philosophy rejected', throws(() => validateStyleDefinition({ ...validDef(), philosophy: '' }), 'philosophy'));
check('bad status rejected', throws(() => validateStyleDefinition({ ...validDef(), status: 'draft' }), 'status'));
check('unknown renderStyle rejected', throws(() => validateStyleDefinition({ ...validDef(), renderStyle: 'watercolor' }), 'renderStyle'));
check('empty composition rejected', throws(() => validateStyleDefinition({ ...validDef(), composition: [] }), 'composition'));
check('bad pace rejected', throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, pace: 'frantic' } }), 'pace'));
check(
  'unregistered camera preset rejected',
  throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, cameraPresets: ['dollyZoom'] } }), 'not a registered')
);
check(
  'cross-category motion ref rejected (camera preset in transitions)',
  throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, transitions: ['slowZoom'] } }), 'transition')
);
check(
  'effect preset accepted in effects (dust)',
  !throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, effects: ['dust'] } }))
);
check(
  'transition preset accepted in transitions (heroReveal)',
  !throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, transitions: ['heroReveal'] } }))
);
check(
  'empty transitions/effects arrays allowed',
  !throws(() => validateStyleDefinition({ ...validDef(), motion: { ...validDef().motion, transitions: [], effects: [] } }))
);
check(
  'self-contradiction rejected (forbidden term in own anchors)',
  throws(() => {
    const d = validDef();
    d.forbidden = [...d.forbidden, 'dark cinematic grade'];
    validateStyleDefinition(d);
  }, 'incompatible')
);
check(
  'empty imagePrompt.suffix allowed (must still be a string)',
  !throws(() => {
    const d = validDef();
    d.imagePrompt = { ...d.imagePrompt, suffix: '' };
    validateStyleDefinition(d);
  })
);

// Every registered style's motion preferences must resolve to IMPLEMENTED
// motion of the right category — re-checked here against the live registry so
// a Motion Engine regression (un-implementing a kind) is caught by this test.
for (const name of styleBible.list()) {
  const s = styleBible.get(name);
  const allResolved = [
    ...s.motion.cameraPresets.map((r) => ['camera', r]),
    ...s.motion.transitions.map((r) => ['transition', r]),
    ...s.motion.effects.map((r) => ['effect', r]),
  ].every(([cat, ref]) => {
    const resolved = motionRegistry.has(cat, ref) ? resolveMotion({ category: cat, kind: ref }) : resolveMotion(ref);
    return resolved && resolved.category === cat && resolved.def?.status === 'implemented';
  });
  check(`"${name}" motion preferences all implemented`, allResolved);
}

// --- defaults + resolution --------------------------------------------------------
console.log('resolution:');
check('default for cinematic is cinematic', defaultVisualStyle('cinematic') === 'cinematic');
check('default for vox is paper-collage', defaultVisualStyle('vox') === 'paper-collage');
check('default for luxury is luxury', defaultVisualStyle('luxury') === 'luxury');
check('unknown render style defaults to cinematic', defaultVisualStyle('watercolor') === 'cinematic');
check('valid active choice resolves to itself', resolveVisualStyle('history', 'cinematic').name === 'history');
check('null choice → render default (legacy projects)', resolveVisualStyle(null, 'vox').name === 'paper-collage');
check('unknown choice → render default, never a crash', resolveVisualStyle('vaporwave', 'cinematic').name === 'cinematic');
check('future style not resolvable (degrades to default)', resolveVisualStyle('pixar-style', 'cinematic').name === 'cinematic');
check('unknown choice + unknown render style → cinematic', resolveVisualStyle('vaporwave', 'watercolor').name === 'cinematic');

// --- API options ------------------------------------------------------------------
console.log('options:');
const options = visualStyleOptions();
check('9 selectable options', options.length === 9);
check('option shape is {id, name, description, renderStyle}', options.every((o) => o.id && o.name && o.description && o.renderStyle && Object.keys(o).length === 4));
check('no future styles offered', !options.some((o) => o.id === 'pixar-style' || o.id === 'anime'));
check('every option belongs to a real render style', options.every((o) => ['vox', 'luxury', 'cinematic'].includes(o.renderStyle)));
check('7 cinematic looks offered', options.filter((o) => o.renderStyle === 'cinematic').length === 7);

// --- image prompt composition ------------------------------------------------------
console.log('composeImagePrompt:');
const history = styleBible.get('history');
const composed = composeImagePrompt(history, 'a general on horseback surveying the field.');
check('prefix leads', composed.startsWith(history.imagePrompt.prefix));
check('shot description follows the prefix', composed.indexOf('a general on horseback') > composed.indexOf(history.imagePrompt.prefix));
check('every consistency anchor present', history.consistency.promptAnchors.every((a) => composed.includes(a)));
check('suffix ends the prompt', composed.endsWith('period-accurate detail'));
check('trailing punctuation stripped before joining', !composed.includes('field., '));
check('comma-joined single line', !composed.includes('\n'));
const noSuffix = composeImagePrompt({ ...history, imagePrompt: { ...history.imagePrompt, suffix: '' } }, 'a map');
check('empty suffix leaves no dangling comma', !noSuffix.endsWith(', ') && noSuffix.endsWith(history.consistency.promptAnchors.at(-1)));
check('anchors identical across shots of one project', composeImagePrompt(history, 'shot A').endsWith(composed.slice(composed.indexOf(history.consistency.promptAnchors[0]))) === composeImagePrompt(history, 'shot B').endsWith(composed.slice(composed.indexOf(history.consistency.promptAnchors[0]))));
check('capped under provider URL limits', composeImagePrompt(history, 'x'.repeat(5000)).length <= 1200);

// --- shot planner prompt composition -------------------------------------------------
console.log('shotsPrompt:');
const words = 'the quick brown fox jumps over the lazy dog again and again'.split(' ').map((word) => ({ word }));
for (const name of styleBible.listActive()) {
  const v = styleBible.get(name);
  const prompt = shotsPrompt({ title: 'Test', script: 'A test script.', words, visual: v });
  const ok =
    prompt.includes(v.displayName) &&
    prompt.includes(v.philosophy) &&
    prompt.includes(v.colorPalette.description) &&
    v.composition.every((r) => prompt.includes(r)) &&
    v.consistency.rules.every((r) => prompt.includes(r)) &&
    v.forbidden.every((f) => prompt.includes(f)) &&
    prompt.includes(`"${v.motion.cameraPresets[0]}"`) &&
    !prompt.includes('undefined');
  check(`"${name}" composes a complete planner prompt`, ok);
}
const cine = styleBible.get('cinematic');
const cinePrompt = shotsPrompt({ title: 'T', script: 'S', words, visual: cine });
check('planner offered ONLY the style\'s camera presets', cine.motion.cameraPresets.every((p) => cinePrompt.includes(`"${p}"`)));
const notOffered = motionRegistry
  .list('preset')
  .filter((p) => resolveMotion(p).category === 'camera' && !cine.motion.cameraPresets.includes(p));
check('presets outside the style are NOT offered', notOffered.length > 0 && !notOffered.some((p) => cinePrompt.includes(`"${p}" (`)));
check('style transition frequency guidance included', cinePrompt.includes(cine.motion.transitionFrequency));

if (failures) {
  console.error(`\n${failures}/${total} FAILURE(S)`);
  process.exit(1);
}
console.log(`\nALL ${total} STYLE BIBLE CHECKS PASSED`);
