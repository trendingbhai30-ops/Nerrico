import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'projects');

fs.mkdirSync(DATA_DIR, { recursive: true });

export function projectDir(id) {
  return path.join(DATA_DIR, id);
}

function projectFile(id) {
  return path.join(projectDir(id), 'project.json');
}

export function createProject({ title, research, voiceId, mode, language, style, format }) {
  const id = crypto.randomBytes(6).toString('hex');
  const project = {
    id,
    title,
    research,
    voiceId: voiceId || null,
    mode: mode || 'normal',
    language: language || 'english',
    style: style || 'vox',
    format: format || 'reel',
    status: 'created',
    script: null,
    slides: null,
    error: null,
    failedStep: null,
    progress: { step: 'Created', percent: 0 },
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(projectDir(id), { recursive: true });
  saveProject(project);
  return project;
}

export function getProject(id) {
  const file = projectFile(id);
  if (!fs.existsSync(file)) return null;
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Defaults for projects created before modes/styles existed.
  project.mode ||= 'normal';
  project.language ||= 'english';
  project.style ||= 'vox';
  project.format ||= 'reel';
  project.slides ??= null;
  return project;
}

export function saveProject(project) {
  const dir = projectDir(project.id);
  if (!fs.existsSync(dir)) return; // project was deleted mid-pipeline
  fs.writeFileSync(projectFile(project.id), JSON.stringify(project, null, 2));
}

export function updateProject(id, patch) {
  const project = getProject(id);
  if (!project) return null;
  Object.assign(project, patch);
  saveProject(project);
  return project;
}

export function listProjects() {
  return fs
    .readdirSync(DATA_DIR)
    .map((id) => getProject(id))
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteProject(id) {
  const dir = projectDir(id);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function artifactPath(id, name) {
  return path.join(projectDir(id), name);
}
