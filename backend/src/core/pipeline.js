import fs from 'node:fs';
import archiver from 'archiver';
import { env } from '../config/env.js';
import { ARTIFACTS } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';
import { errorMessage } from '../utils/errors.js';
import { getProject, updateProject, artifactPath } from './store.js';
import { askClaude } from '../providers/claude.js';
import { generateVoiceover } from '../providers/elevenlabs.js';
import { generateImage } from '../providers/images/index.js';
import { fetchStockImage } from '../providers/stock.js';
import { fetchCommonsImage } from '../providers/commons.js';
import { scriptPrompt } from '../content/prompts.js';
import { getMode } from '../content/modes.js';
import { brandingProps } from '../content/branding.js';
import { planScenes } from './scenes.js';
import { planSlides } from './slides.js';
import { renderShort, renderSlides } from './render.js';

const log = createLogger('pipeline');
const running = new Set();

export function isRunning(id) {
  return running.has(id);
}

function fail(id, step, error) {
  updateProject(id, {
    status: 'failed',
    failedStep: step,
    error: errorMessage(error),
  });
  log.error(`${id} failed at ${step}:`, error);
}

function projectBranding(p) {
  return getMode(p.mode)?.branded ? brandingProps(env.port) : null;
}

async function stepScript(id) {
  const p = getProject(id);
  if (p.format === 'carousel') {
    updateProject(id, { status: 'scripting', error: null, progress: { step: 'Designing your slides…', percent: 5 } });
    const slides = await planSlides({ title: p.title, research: p.research, mode: p.mode, language: p.language });
    if (!getProject(id)) return; // deleted meanwhile
    updateProject(id, { status: 'script_ready', slides, failedStep: null, progress: { step: 'Slides ready for review', percent: 15 } });
    return;
  }
  updateProject(id, { status: 'scripting', error: null, progress: { step: 'Writing your script…', percent: 5 } });
  const script = await askClaude(
    scriptPrompt({ title: p.title, research: p.research, mode: p.mode, language: p.language })
  );
  if (!getProject(id)) return; // deleted meanwhile
  updateProject(id, { status: 'script_ready', script, failedStep: null, progress: { step: 'Script ready for review', percent: 15 } });
}

async function stepVoice(id) {
  const p = getProject(id);
  updateProject(id, { status: 'voicing', error: null, progress: { step: 'Recording the voiceover…', percent: 20 } });
  const { words, durationSec } = await generateVoiceover({
    text: p.script,
    voiceId: p.voiceId,
    outMp3: artifactPath(id, ARTIFACTS.voiceover),
  });
  fs.writeFileSync(artifactPath(id, ARTIFACTS.timing), JSON.stringify({ words, durationSec }));
}

async function stepScenes(id) {
  const p = getProject(id);
  updateProject(id, { status: 'planning_scenes', error: null, progress: { step: 'Designing the scenes…', percent: 32 } });
  const { words } = JSON.parse(fs.readFileSync(artifactPath(id, ARTIFACTS.timing), 'utf8'));
  const scenes = await planScenes({ title: p.title, script: p.script, words, style: p.style });

  // Cinematic shots — visual-priority chain, every shot MUST get imagery:
  //   1. AI image (chain in providers/images, keyless Pollinations last resort)
  //   2. royalty-free stock photo (Pexels/Pixabay/Openverse/Commons)
  //   3. icon/illustration scene built by the Remotion component from s.icons
  // Bare text is never a planned outcome.
  const attributions = [];
  const shotIdxs = scenes.map((s, i) => (s.type === 'shot' ? i : -1)).filter((i) => i >= 0);
  for (let n = 0; n < shotIdxs.length; n++) {
    const i = shotIdxs[n];
    const s = scenes[i];
    updateProject(id, {
      progress: { step: `Creating visual ${n + 1} of ${shotIdxs.length}…`, percent: 33 + Math.round((n / shotIdxs.length) * 6) },
    });
    const ok = await generateImage(s.imagePrompt, artifactPath(id, ARTIFACTS.shotPng(i)), { seed: i }).catch(() => null);
    if (ok) {
      s.image = ARTIFACTS.shotPng(i);
      continue;
    }
    const stockQuery = s.query || s.caption || null;
    const stock = stockQuery
      ? await fetchStockImage(stockQuery, artifactPath(id, ARTIFACTS.shotJpg(i))).catch(() => null)
      : null;
    if (stock) {
      s.image = ARTIFACTS.shotJpg(i);
      attributions.push({ scene: i, query: stockQuery, ...stock.attribution });
    }
    // else: CinScene renders the icon/illustration fallback from s.icons.
  }

  // Fetch a real photo for each photo scene; fall back to headline if none found.
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (s.type !== 'photo') continue;
    updateProject(id, {
      progress: { step: `Finding photo: ${s.query}…`, percent: 33 + Math.round((i / scenes.length) * 5) },
    });
    const image = s.query
      ? await fetchCommonsImage(s.query, artifactPath(id, ARTIFACTS.photo(i))).catch(() => null)
      : null;
    if (image) {
      s.image = ARTIFACTS.photo(i);
      attributions.push({ scene: i, query: s.query, ...image.attribution });
    } else {
      s.type = 'headline';
    }
  }
  fs.writeFileSync(artifactPath(id, ARTIFACTS.scenes), JSON.stringify(scenes, null, 2));
  fs.writeFileSync(artifactPath(id, ARTIFACTS.attributions), JSON.stringify(attributions, null, 2));
}

async function stepRender(id) {
  const p = getProject(id);
  updateProject(id, { status: 'rendering', error: null, progress: { step: 'Rendering the video…', percent: 40 } });
  const { words, durationSec } = JSON.parse(fs.readFileSync(artifactPath(id, ARTIFACTS.timing), 'utf8'));
  const scenes = JSON.parse(fs.readFileSync(artifactPath(id, ARTIFACTS.scenes), 'utf8'));
  for (const s of scenes) {
    if ((s.type === 'photo' || s.type === 'shot') && s.image) {
      s.src = `http://127.0.0.1:${env.port}/api/projects/${id}/asset/${s.image}`;
    }
  }
  await renderShort({
    inputProps: {
      audioUrl: `http://127.0.0.1:${env.port}/api/projects/${id}/audio`,
      words,
      scenes,
      durationSec,
      style: p.style,
      branding: projectBranding(p),
    },
    outMp4: artifactPath(id, ARTIFACTS.video),
    outPng: artifactPath(id, ARTIFACTS.thumbnail),
    onProgress: (progress) => {
      updateProject(id, {
        progress: { step: `Rendering the video… ${Math.round(progress * 100)}%`, percent: Math.round(40 + progress * 59) },
      });
    },
  });
  if (!getProject(id)) return;
  updateProject(id, { status: 'done', failedStep: null, progress: { step: 'Done', percent: 100 } });
  log.info(`${id} done (video)`);
}

function zipSlides(id, count) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(artifactPath(id, ARTIFACTS.slidesZip));
    const archive = archiver('zip', { zlib: { level: 9 } });
    out.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(out);
    for (let i = 1; i <= count; i++) {
      archive.file(artifactPath(id, ARTIFACTS.slide(i)), { name: ARTIFACTS.slide(i) });
    }
    archive.finalize();
  });
}

async function stepRenderSlides(id) {
  const p = getProject(id);
  updateProject(id, { status: 'rendering', error: null, progress: { step: 'Rendering the slides…', percent: 20 } });
  await renderSlides({
    slides: p.slides,
    style: p.style,
    branding: projectBranding(p),
    outPath: (i) => artifactPath(id, ARTIFACTS.slide(i + 1)),
    onProgress: (done, total) => {
      updateProject(id, {
        progress: { step: `Rendering slide ${done} of ${total}…`, percent: 20 + Math.round((done / total) * 70) },
      });
    },
  });
  if (!getProject(id)) return;
  updateProject(id, { progress: { step: 'Packing the zip…', percent: 95 } });
  await zipSlides(id, p.slides.length);
  fs.copyFileSync(artifactPath(id, ARTIFACTS.slide(1)), artifactPath(id, ARTIFACTS.thumbnail));
  if (!getProject(id)) return;
  updateProject(id, { status: 'done', failedStep: null, progress: { step: 'Done', percent: 100 } });
  log.info(`${id} done (carousel)`);
}

async function guard(id, fn) {
  if (running.has(id)) return;
  running.add(id);
  try {
    await fn();
  } finally {
    running.delete(id);
  }
}

export function startScriptGeneration(id) {
  guard(id, async () => {
    try {
      await stepScript(id);
    } catch (e) {
      fail(id, 'script', e);
    }
  });
}

export function startProduction(id, { from } = {}) {
  guard(id, async () => {
    const p = getProject(id);
    if (!p) return;
    const isCarousel = p.format === 'carousel';
    const order = isCarousel ? ['renderSlides'] : ['voice', 'scenes', 'render'];
    const steps = { voice: stepVoice, scenes: stepScenes, render: stepRender, renderSlides: stepRenderSlides };
    const start = from && order.includes(from) ? order.indexOf(from) : 0;
    for (const step of order.slice(start)) {
      if (!getProject(id)) return; // deleted meanwhile
      try {
        await steps[step](id);
      } catch (e) {
        fail(id, step, e);
        return;
      }
    }
  });
}

export function retry(id) {
  const p = getProject(id);
  if (p.failedStep === 'script' || !p.failedStep) {
    startScriptGeneration(id);
  } else {
    startProduction(id, { from: p.failedStep });
  }
}
