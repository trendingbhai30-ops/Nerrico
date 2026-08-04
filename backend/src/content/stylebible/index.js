// Nerrico Style Bible — public API.
//
// Import surface for everything outside stylebible/:
//   import { styleBible, getVisualStyle, defaultVisualStyle, composeImagePrompt }
//     from '../content/stylebible/index.js'
//
// Importing this module also registers all built-in styles (styles/index.js
// registers on load) — same pattern as the Motion Engine's public index.

import { styleBible } from './registry.js';
// Side-effect: register every built-in style.
import './styles/index.js';

export { styleBible };
export { validateStyleDefinition } from './schema.js';

// Default visual style per render style — what a project gets when it doesn't
// choose one. 'cinematic' maps to the bible style that codifies the current
// production look, so existing behaviour is preserved by default.
const DEFAULTS = {
  cinematic: 'cinematic',
  vox: 'paper-collage',
  luxury: 'luxury',
};

/** @returns {object|null} the frozen style definition, or null. */
export function getVisualStyle(name) {
  return styleBible.get(name);
}

/**
 * Resolve a project's visual style: its own choice if valid and active,
 * else the default for its render style. Never returns null for known
 * render styles — old projects (no visualStyle field) resolve to defaults.
 */
export function resolveVisualStyle(visualStyle, renderStyle) {
  const chosen = styleBible.get(visualStyle);
  if (chosen && chosen.status === 'active') return chosen;
  return styleBible.get(DEFAULTS[renderStyle] || 'cinematic');
}

export function defaultVisualStyle(renderStyle) {
  return DEFAULTS[renderStyle] || 'cinematic';
}

/** Active styles as the API exposes them (GET /api/options). */
export function visualStyleOptions() {
  return styleBible.listActive().map((name) => {
    const s = styleBible.get(name);
    return { id: s.name, name: s.displayName, description: s.description, renderStyle: s.renderStyle };
  });
}

/**
 * THE consistency system's enforcement point: every AI image request is
 * composed here, deterministically, from structured data — never ad-hoc in
 * the pipeline. Layout: style prefix (medium + look) → the planner's shot
 * description → the style's prompt anchors (palette/grade descriptors shared
 * by EVERY shot of the video) → suffix. Comma-joined phrase style, which is
 * what image models parse best; capped well under provider URL limits.
 * @param {object} style  A Style Bible definition.
 * @param {string} shotPrompt  The planner's per-shot image description.
 * @returns {string}
 */
export function composeImagePrompt(style, shotPrompt) {
  const clean = (s) => String(s || '').trim().replace(/[.,\s]+$/, '');
  const parts = [
    clean(style.imagePrompt.prefix),
    clean(shotPrompt),
    ...style.consistency.promptAnchors.map(clean),
    clean(style.imagePrompt.suffix),
  ].filter(Boolean);
  return parts.join(', ').slice(0, 1200);
}
