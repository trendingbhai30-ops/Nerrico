import { askClaudeJson } from '../providers/claude.js';
import { scenesPrompt, shotsPrompt } from '../content/prompts.js';
import { getStyleDef } from '../content/styles.js';
import { motionRegistry, resolveMotion } from '../../remotion/motion/index.js';

/**
 * Ask Claude to plan scenes, then validate/repair the result.
 * Retries once with the validation error appended to the prompt.
 */
export function planScenes({ title, script, words, style = 'vox' }) {
  const styleDef = getStyleDef(style);
  const cinematic = style === 'cinematic';
  const prompt = cinematic
    ? shotsPrompt({ title, script, words })
    : scenesPrompt({ title, script, words, style });
  return askClaudeJson(
    prompt,
    (data) => (cinematic ? validateShots(data, words.length) : validateScenes(data, words.length, styleDef)),
    { label: 'Scene planning' }
  );
}

const CAMERAS = ['zoomIn', 'zoomOut', 'panLeft', 'panRight'];

// Planner-emitted motion fields are checked against the Motion Registry here —
// an unregistered name is stripped to null (the compositions then fall back to
// the legacy camera move), so an invalid preset can never reach a render.
const registeredOrNull = (category, name) =>
  typeof name === 'string' && motionRegistry.has(category, name) ? name : null;

// The "transition" field accepts a transition KIND ('slide') or a
// transition-category PRESET ('heroReveal') — Phase 2D-1, when heroReveal
// entered the prompt vocabulary. Camera/effect presets are still rejected.
const transitionOrNull = (name) => {
  if (registeredOrNull('transition', name)) return name;
  if (registeredOrNull('preset', name) && resolveMotion(name).category === 'transition') return name;
  return null;
};

export function validateShots(data, wordCount) {
  const shots = data?.shots || data?.scenes;
  if (!Array.isArray(shots) || shots.length === 0) {
    throw new Error('missing non-empty "shots" array');
  }
  const scenes = shots.map((s, i) => ({
    type: 'shot',
    start: Math.trunc(Number(s.start)),
    end: Math.trunc(Number(s.end)),
    imagePrompt: s.imagePrompt ? String(s.imagePrompt).slice(0, 600) : null,
    query: s.query ? String(s.query).slice(0, 80) : null,
    icons: Array.isArray(s.icons) ? s.icons.map(String).slice(0, 3) : [],
    caption: s.caption ? String(s.caption).slice(0, 60) : '',
    emphasis: Array.isArray(s.emphasis) ? s.emphasis.map(String).slice(0, 2) : [],
    camera: CAMERAS.includes(s.camera) ? s.camera : CAMERAS[i % CAMERAS.length],
    motion: registeredOrNull('preset', s.motion),
    transition: transitionOrNull(s.transition),
    effect: registeredOrNull('effect', s.effect),
  }));
  for (const s of scenes) {
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) {
      throw new Error('shot start/end must be integers');
    }
    if (!s.imagePrompt) throw new Error('every shot needs an "imagePrompt"');
  }
  scenes.sort((a, b) => a.start - b.start);
  // Same contiguous-coverage repair as validateScenes.
  scenes[0].start = 0;
  for (let i = 1; i < scenes.length; i++) {
    scenes[i].start = Math.max(scenes[i - 1].start + 1, Math.min(scenes[i].start, wordCount - 1));
    scenes[i - 1].end = scenes[i].start - 1;
  }
  scenes[scenes.length - 1].end = wordCount - 1;
  for (const s of scenes) {
    if (s.end < s.start) throw new Error(`shot covering words ${s.start}-${s.end} is empty after repair`);
  }
  return scenes;
}

export function validateScenes(data, wordCount, styleDef = getStyleDef('vox')) {
  if (!data || !Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error('missing non-empty "scenes" array');
  }
  const allowedTypes = new Set(styleDef.sceneTypes);
  const scenes = data.scenes.map((s, i) => ({
    type: allowedTypes.has(s.type) ? s.type : 'headline',
    start: Math.trunc(Number(s.start)),
    end: Math.trunc(Number(s.end)),
    emphasis: Array.isArray(s.emphasis) ? s.emphasis.map(String).slice(0, 3) : [],
    title: s.title ? String(s.title).slice(0, 40) : null,
    value: s.value ? String(s.value).slice(0, 14) : null,
    label: s.label ? String(s.label).slice(0, 50) : null,
    icon: styleDef.useIcons && s.icon ? String(s.icon).slice(0, 8) : null,
    query: s.query ? String(s.query).slice(0, 80) : null,
    points: Array.isArray(s.points)
      ? s.points
          .slice(0, 8)
          .map((p) => ({ label: String(p.label).slice(0, 12), value: Number(p.value) }))
          .filter((p) => Number.isFinite(p.value))
      : null,
    scheme: Number.isInteger(s.scheme) && s.scheme >= 0 && s.scheme < styleDef.schemeCount ? s.scheme : 0,
  }));

  scenes.sort((a, b) => a.start - b.start);
  for (const s of scenes) {
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) {
      throw new Error('scene start/end must be integers');
    }
  }

  // Repair coverage instead of rejecting: contiguous, full range.
  scenes[0].start = 0;
  for (let i = 1; i < scenes.length; i++) {
    scenes[i].start = Math.max(scenes[i - 1].start + 1, Math.min(scenes[i].start, wordCount - 1));
    scenes[i - 1].end = scenes[i].start - 1;
  }
  scenes[scenes.length - 1].end = wordCount - 1;

  for (const s of scenes) {
    if (s.end < s.start) throw new Error(`scene covering words ${s.start}-${s.end} is empty after repair`);
    if (s.type === 'stat' && !s.value) s.type = 'headline';
    if (s.type === 'photo' && !s.query) s.type = 'headline';
    if (s.type === 'chart' && (!s.points || s.points.length < 3)) s.type = 'headline';
  }
  return scenes;
}
