// Nerrico Motion Engine (NME) — full-frame effects (grain, glow, vignette…).
//
// Phase 2A: vocabulary + dispatch contract only. Effects differ from camera/
// transitions: an effect's `apply` returns either a CSS style descriptor for
// an overlay layer, or null when the effect renders nothing. Heavier effects
// (particles) will additionally register a component in Phase 2B — the
// definition object is where that hook will live.
//
// Note: cinematic.jsx already has hand-rolled Grain/vignette; those migrate
// INTO these definitions in Phase 2B. They are not duplicated here now to
// avoid two sources of truth mid-migration.

import { motionRegistry } from '../registry.js';
import { warnOnce } from '../utils.js';

motionRegistry.register('effect', {
  name: 'filmGrain',
  category: 'effect',
  status: 'planned',
  description: 'Animated photographic grain overlay',
  params: {
    opacity: { default: 0.1, description: 'Overlay opacity' },
    size: { default: 0.8, description: 'Grain frequency (higher = finer)' },
  },
});

motionRegistry.register('effect', {
  name: 'blur',
  category: 'effect',
  status: 'planned',
  description: 'Full-frame gaussian blur (dream/depth cue)',
  params: {
    radiusPx: { default: 6, description: 'Blur radius' },
  },
});

motionRegistry.register('effect', {
  name: 'glow',
  category: 'effect',
  status: 'planned',
  description: 'Soft bloom on bright areas',
  params: {
    strength: { default: 0.5, description: 'Bloom intensity' },
    color: { default: null, description: 'Optional tint; null = source color' },
  },
});

motionRegistry.register('effect', {
  name: 'noise',
  category: 'effect',
  status: 'planned',
  description: 'Static/analog noise overlay (harsher than filmGrain)',
  params: {
    opacity: { default: 0.14, description: 'Overlay opacity' },
  },
});

motionRegistry.register('effect', {
  name: 'particles',
  category: 'effect',
  status: 'planned',
  description: 'Floating particles (dust, embers, snow)',
  params: {
    kind: { default: 'dust', description: 'dust | embers | snow' },
    count: { default: 40, description: 'Particle count (perf-bounded)' },
  },
});

motionRegistry.register('effect', {
  name: 'vignette',
  category: 'effect',
  status: 'planned',
  description: 'Darkened frame edges focusing the eye',
  params: {
    strength: { default: 0.4, description: 'Edge darkness 0–1' },
    spread: { default: 0.55, description: 'Where falloff begins (0 center, 1 edge)' },
  },
});

/**
 * Effect frame state at frame `t` progress. Planned/unknown effects return
 * null — "render no overlay" — so styles can map over effect lists safely.
 * @param {import('../types.js').ResolvedMotion} motion
 * @param {number} t
 * @returns {object|null}
 */
export function getEffectState(motion, t) {
  const def = motion.def;
  if (!def || def.category !== 'effect') return null;
  if (!def.apply) {
    warnOnce(`effect-stub:${def.name}`, `Effect "${def.name}" is planned but not implemented — skipped`);
    return null;
  }
  return def.apply(t, motion);
}
