import { Router } from 'express';
import fs from 'node:fs';
import { HttpError } from '../../utils/errors.js';
import {
  createProject,
  getProject,
  updateProject,
  listProjects,
  deleteProject,
  artifactPath,
} from '../../core/store.js';
import { getVoice } from '../../content/voices.js';
import { LANGUAGES, FORMATS, getMode } from '../../content/modes.js';
import { STYLES } from '../../content/styles.js';
import { styleBible, defaultVisualStyle } from '../../content/stylebible/index.js';
import { validateSlides } from '../../core/slides.js';
import { startScriptGeneration, startProduction, retry, isRunning } from '../../core/pipeline.js';

export const projectsRouter = Router();

/** Shape of a project as the frontend sees it. */
function publicProject(p) {
  const isCarousel = p.format === 'carousel';
  const done = p.status === 'done';
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    research: p.research,
    voiceId: p.voiceId,
    mode: p.mode,
    language: p.language,
    style: p.style,
    visualStyle: p.visualStyle,
    format: p.format,
    script: p.script,
    slides: p.slides,
    error: p.error,
    progress: p.progress,
    videoUrl: done && !isCarousel ? `/api/projects/${p.id}/video` : null,
    slideUrls:
      done && isCarousel && Array.isArray(p.slides)
        ? p.slides.map((_, i) => `/api/projects/${p.id}/slide/${i + 1}`)
        : null,
    zipUrl: done && isCarousel ? `/api/projects/${p.id}/slides.zip` : null,
    createdAt: p.createdAt,
  };
}

/** Load the project for :id or throw a 404. */
function requireProject(req) {
  const p = getProject(req.params.id);
  if (!p) throw new HttpError(404, 'Project not found');
  return p;
}

// ---------- CRUD ----------

projectsRouter.post('/', (req, res) => {
  const {
    title,
    research,
    voiceId,
    mode = 'normal',
    language = 'english',
    style = 'vox',
    visualStyle,
    format = 'reel',
  } = req.body || {};
  if (!title || typeof title !== 'string') throw new HttpError(400, 'A title is required');
  if (!getMode(mode)) throw new HttpError(400, 'Unknown mode');
  if (!LANGUAGES.includes(language)) throw new HttpError(400, 'Unknown language');
  if (!STYLES[style]) throw new HttpError(400, 'Unknown style');
  // visualStyle is optional (defaults to the render style's codified look) but
  // when provided it must be a selectable Style Bible entry — 'future' styles
  // are declared, not offered.
  if (visualStyle !== undefined && styleBible.get(visualStyle)?.status !== 'active') {
    throw new HttpError(400, 'Unknown visual style');
  }
  if (!FORMATS.includes(format)) throw new HttpError(400, 'Unknown format');
  const researchText = typeof research === 'string' ? research.trim() : '';
  if (!researchText && !getMode(mode).researchOptional) {
    throw new HttpError(400, 'Research text is required');
  }
  if (format === 'reel' && !getVoice(voiceId)) throw new HttpError(400, 'Unknown voiceId');
  const project = createProject({
    title: title.trim(),
    research: researchText,
    voiceId: format === 'reel' ? voiceId : null,
    mode,
    language,
    style,
    visualStyle: visualStyle || defaultVisualStyle(style),
    format,
  });
  res.status(201).json({ id: project.id });
});

projectsRouter.get('/', (req, res) => {
  res.json({
    projects: listProjects().map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.createdAt,
      thumbnailUrl: fs.existsSync(artifactPath(p.id, 'thumbnail.png'))
        ? `/api/projects/${p.id}/thumbnail`
        : null,
    })),
  });
});

projectsRouter.get('/:id', (req, res) => {
  res.json(publicProject(requireProject(req)));
});

projectsRouter.delete('/:id', (req, res) => {
  if (!deleteProject(req.params.id)) throw new HttpError(404, 'Project not found');
  res.status(204).end();
});

// ---------- pipeline actions ----------

projectsRouter.post('/:id/script/generate', (req, res) => {
  const p = requireProject(req);
  if (isRunning(p.id)) throw new HttpError(409, 'This project is already being worked on');
  startScriptGeneration(p.id);
  res.status(202).json({ ok: true });
});

projectsRouter.put('/:id/script', (req, res) => {
  const p = requireProject(req);
  if (p.status !== 'script_ready') throw new HttpError(409, 'Script can only be edited while it is ready for review');
  const { script } = req.body || {};
  if (!script || typeof script !== 'string') throw new HttpError(400, 'A script string is required');
  updateProject(p.id, { script: script.trim() });
  res.json({ ok: true });
});

projectsRouter.put('/:id/slides', (req, res) => {
  const p = requireProject(req);
  if (p.format !== 'carousel') throw new HttpError(409, 'This project is not a carousel');
  if (p.status !== 'script_ready') throw new HttpError(409, 'Slides can only be edited while they are ready for review');
  try {
    const slides = validateSlides({ slides: req.body?.slides }, { branded: Boolean(getMode(p.mode)?.branded) });
    updateProject(p.id, { slides });
    res.json({ ok: true });
  } catch (e) {
    throw new HttpError(400, e.message);
  }
});

projectsRouter.post('/:id/approve', (req, res) => {
  const p = requireProject(req);
  if (p.status !== 'script_ready') throw new HttpError(409, 'Only a project with a ready script can be approved');
  if (isRunning(p.id)) throw new HttpError(409, 'This project is already being worked on');
  startProduction(p.id);
  res.status(202).json({ ok: true });
});

projectsRouter.post('/:id/retry', (req, res) => {
  const p = requireProject(req);
  if (p.status !== 'failed') throw new HttpError(409, 'Only a failed project can be retried');
  if (isRunning(p.id)) throw new HttpError(409, 'This project is already being worked on');
  retry(p.id);
  res.status(202).json({ ok: true });
});

// ---------- generated files ----------

function sendArtifact(req, res, name, type) {
  const p = requireProject(req);
  const file = artifactPath(p.id, name);
  if (!fs.existsSync(file)) throw new HttpError(404, 'Not generated yet');
  res.type(type).sendFile(file); // sendFile handles Range requests for video playback
}

projectsRouter.get('/:id/video', (req, res) => sendArtifact(req, res, 'video.mp4', 'video/mp4'));
projectsRouter.get('/:id/thumbnail', (req, res) => sendArtifact(req, res, 'thumbnail.png', 'image/png'));
projectsRouter.get('/:id/audio', (req, res) => sendArtifact(req, res, 'voiceover.mp3', 'audio/mpeg'));
projectsRouter.get('/:id/asset/:name', (req, res) => {
  if (!/^(photo|shot)-\d+\.(jpg|png)$/.test(req.params.name)) throw new HttpError(400, 'Bad asset name');
  sendArtifact(req, res, req.params.name, req.params.name.endsWith('.png') ? 'image/png' : 'image/jpeg');
});
projectsRouter.get('/:id/slide/:n', (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new HttpError(400, 'Bad slide number');
  sendArtifact(req, res, `slide-${n}.png`, 'image/png');
});
projectsRouter.get('/:id/slides.zip', (req, res) => sendArtifact(req, res, 'slides.zip', 'application/zip'));
