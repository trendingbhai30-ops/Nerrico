import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { createLogger } from '../utils/logger.js';

const log = createLogger('render');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(__dirname, '..', '..', 'remotion', 'index.js');

let bundlePromise = null;

export function ensureBundle() {
  if (!bundlePromise) {
    bundlePromise = log.time('remotion bundle', () =>
      bundle({ entryPoint: ENTRY }).catch((e) => {
        bundlePromise = null; // allow retry after a failed bundle
        throw e;
      })
    );
  }
  return bundlePromise;
}

// One render at a time — the GPU/CPU can't do two 1080x1920 renders in parallel anyway.
let renderLock = Promise.resolve();

/**
 * Render every carousel slide as a 1080x1350 PNG via the "Slide" composition.
 * outPath(i) → absolute output path for slide i (0-based). Returns the paths.
 */
export function renderSlides({ slides, style, branding, outPath, onProgress }) {
  const job = renderLock.then(async () => {
    const serveUrl = await ensureBundle();
    const total = slides.length;
    const composition = await selectComposition({
      serveUrl,
      id: 'Slide',
      inputProps: { slide: slides[0], index: 0, total, style, branding },
    });
    const outputs = [];
    for (let i = 0; i < total; i++) {
      const output = outPath(i);
      const props = { slide: slides[i], index: i, total, style, branding };
      await renderStill({
        // renderStill renders composition.props (resolved at selectComposition time),
        // not inputProps — override it per slide or every still comes out as slide 1.
        composition: { ...composition, props },
        serveUrl,
        output,
        inputProps: props,
        frame: 0,
      });
      outputs.push(output);
      onProgress?.(i + 1, total);
    }
    return outputs;
  });
  renderLock = job.catch(() => {});
  return job;
}

export function renderShort({ inputProps, outMp4, outPng, onProgress }) {
  const job = renderLock.then(async () => {
    const serveUrl = await ensureBundle();
    const composition = await selectComposition({ serveUrl, id: 'Short', inputProps });
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outMp4,
      inputProps,
      onProgress: ({ progress }) => onProgress?.(progress),
    });
    await renderStill({
      composition,
      serveUrl,
      output: outPng,
      inputProps,
      frame: Math.min(Math.floor(composition.durationInFrames * 0.35), composition.durationInFrames - 1),
    });
  });
  renderLock = job.catch(() => {});
  return job;
}
