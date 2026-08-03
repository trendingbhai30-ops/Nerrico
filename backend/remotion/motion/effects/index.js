// Nerrico Motion Engine (NME) — full-frame effects (grain, glow, vignette…).
//
// An effect's `apply` returns a small numeric state descriptor for an overlay
// layer — rendered by the matching branch in MotionEffect (hooks.js), keyed on
// `state.kind` — or null when the effect renders nothing this frame (planned
// kind, strength 0, or a ramp that has fully settled). All six kinds
// implemented as of Phase 2D-2.
//
// For effects that ramp (blur, glow, vignette), `direction` doubles as the
// animation envelope: 'in' ramps the effect in across its window (the global
// default), 'out' ramps it out, 'hold' pins it at full strength. filmGrain,
// noise and particles are constant-strength by design — their animation is
// internal (seed stepping / particle drift), so they ignore the envelope.

import { motionRegistry } from '../registry.js';
import { clamp01, deepFreeze, warnOnce } from '../utils.js';

// Shared ramp for envelope-driven effects. Eased progress in, strength 0–1 out.
const envelope = (t, motion) =>
  motion.direction === 'out' ? 1 - t : motion.direction === 'hold' ? 1 : t;

motionRegistry.register('effect', {
  name: 'filmGrain',
  category: 'effect',
  status: 'implemented',
  description: 'Animated photographic grain overlay',
  params: {
    opacity: { default: 0.1, description: 'Overlay opacity' },
    size: { default: 0.8, description: 'Grain frequency (higher = finer)' },
  },
  // Same single-SVG-turbulence-rect technique as cinematic.jsx's proven Grain
  // overlay — one filtered rect, no canvas, no per-frame JS pixel work. The
  // seed is derived from eased progress, so the grain animates but any given
  // frame is fully deterministic (re-renders are bit-identical). intensity 0
  // (or opacity 0) returns null: the overlay is skipped entirely.
  apply(t, motion) {
    const opacity = motion.params.opacity * motion.intensity;
    if (opacity <= 0) return null;
    return {
      kind: 'filmGrain',
      opacity: opacity > 1 ? 1 : opacity,
      baseFrequency: motion.params.size,
      seed: 1 + (Math.floor(t * 997) % 19),
    };
  },
});

motionRegistry.register('effect', {
  name: 'blur',
  category: 'effect',
  status: 'implemented',
  description: 'Full-frame gaussian blur (dream/depth cue)',
  directions: ['in', 'out'],
  params: {
    radiusPx: { default: 6, description: 'Blur radius' },
    settle: { default: 0.35, description: 'Fraction of the window the focus ramp occupies' },
    opacity: { default: 1, description: 'Blend of blurred over sharp (0–1)' },
  },
  // Focus semantics, matching camera focusPull: 'in' = focus IN (the scene
  // arrives soft and resolves sharp), 'out' = defocus toward the cut. The
  // ramp occupies only the first (respectively last) `settle` fraction of
  // the window — a whole-scene effect must not leave content soft for the
  // full read, so the scene is sharp for the remaining ~65%. Sub-0.1px
  // radius returns null: the settled frames pay for no backdrop filter.
  // `opacity` < 1 cross-blends the blurred copy over the sharp original.
  apply(t, motion) {
    const settle = Math.min(Math.max(motion.params.settle, 0.05), 1);
    const ramp =
      motion.direction === 'out'
        ? Math.max(0, (t - (1 - settle)) / settle)
        : Math.max(0, 1 - t / settle);
    const radius = motion.params.radiusPx * motion.intensity * ramp;
    if (radius < 0.1) return null;
    return {
      kind: 'blur',
      radiusPx: Math.round(radius * 100) / 100,
      opacity: clamp01(motion.params.opacity),
    };
  },
});

motionRegistry.register('effect', {
  name: 'glow',
  category: 'effect',
  status: 'implemented',
  description: 'Soft bloom on bright areas',
  directions: ['in', 'out', 'hold'],
  params: {
    strength: { default: 0.5, description: 'Bloom intensity' },
    color: { default: null, description: 'Optional tint; null = source color' },
    radiusPx: { default: 16, description: 'Bloom spread radius' },
    opacity: { default: 0.55, description: 'Peak overlay opacity' },
  },
  // The Orton-effect trick: a blurred, brightened copy of the frame layered
  // over the sharp original at partial opacity — bright areas spill light,
  // dark areas stay grounded. The copy IS the backdrop (one backdrop-filter
  // layer in the renderer), so nothing is drawn twice. `strength` drives the
  // brightness lift; the envelope animates the overlay opacity.
  apply(t, motion) {
    const opacity = clamp01(motion.params.opacity * motion.intensity * envelope(t, motion));
    if (opacity < 0.01) return null;
    return {
      kind: 'glow',
      radiusPx: motion.params.radiusPx,
      brightness: 1 + 0.6 * motion.params.strength * motion.intensity,
      opacity,
      color: motion.params.color,
    };
  },
});

motionRegistry.register('effect', {
  name: 'noise',
  category: 'effect',
  status: 'implemented',
  description: 'Static/analog noise overlay (harsher than filmGrain)',
  params: {
    opacity: { default: 0.14, description: 'Overlay opacity' },
    size: { default: 0.9, description: 'Noise frequency (higher = finer)' },
    contrast: { default: 1.6, description: 'Contrast boost (1 = raw turbulence)' },
    seed: { default: 3, description: 'Base seed for the noise field' },
  },
  // filmGrain's hostile sibling: straight `turbulence` (not fractalNoise)
  // pushed through a linear contrast curve reads as analog static, not film.
  // The seed steps with progress exactly like filmGrain — animated frame to
  // frame, but any given frame is fully deterministic.
  apply(t, motion) {
    const opacity = motion.params.opacity * motion.intensity;
    if (opacity <= 0) return null;
    return {
      kind: 'noise',
      opacity: opacity > 1 ? 1 : opacity,
      baseFrequency: motion.params.size,
      contrast: motion.params.contrast,
      seed: motion.params.seed + (Math.floor(t * 883) % 17),
    };
  },
});

// ---------------------------------------------------------------------------
// particles: per-kind look tables + a memoized particle field.
// ---------------------------------------------------------------------------

// sin-hash in [0, 1) — same RNG-free technique as paperReveal's torn edge:
// deterministic per (index, salt), bit-identical on every render.
const hash = (i, salt) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Look tables per particle kind. travelPct = frame-height % travelled across
// the whole window (negative rises); the rest shapes size, sway, flicker and
// color. Frozen — shared by every resolved motion.
const PARTICLE_KINDS = deepFreeze({
  dust: { travelPct: -14, swayPct: 2.5, sizePx: [2, 6], flicker: 0.35, rate: [2, 5], color: '255, 244, 224', glowPx: 2, opacity: [0.25, 0.7] },
  embers: { travelPct: -34, swayPct: 3.5, sizePx: [3, 7], flicker: 0.6, rate: [5, 9], color: '255, 147, 66', glowPx: 8, opacity: [0.45, 0.95] },
  snow: { travelPct: 42, swayPct: 5, sizePx: [3, 9], flicker: 0.15, rate: [1, 3], color: '244, 248, 255', glowPx: 3, opacity: [0.5, 0.9] },
});

// A particle field is every per-particle constant (spawn, size, speed, phase),
// derived once from the sin-hash and cached frozen per (kind, count, seed) —
// per-frame work is then pure trig over `t` in the renderer. The cache is
// bounded in practice: a render uses a handful of distinct field keys.
const fieldCache = new Map();

export function getParticleField(kind, count, seed) {
  const key = `${kind}|${count}|${seed}`;
  let field = fieldCache.get(key);
  if (field) return field;
  const look = PARTICLE_KINDS[kind];
  field = Object.freeze(
    Array.from({ length: count }, (_, i) => {
      const j = i + seed * 101;
      return Object.freeze({
        x0: hash(j, 1) * 100,
        y0: hash(j, 2) * 100,
        sizePx: look.sizePx[0] + hash(j, 3) * (look.sizePx[1] - look.sizePx[0]),
        speedMul: 0.6 + hash(j, 4) * 0.9,
        swayPhase: hash(j, 5) * Math.PI * 2,
        flickerRate: look.rate[0] + hash(j, 6) * (look.rate[1] - look.rate[0]),
        opacity: look.opacity[0] + hash(j, 7) * (look.opacity[1] - look.opacity[0]),
      });
    })
  );
  fieldCache.set(key, field);
  return field;
}

motionRegistry.register('effect', {
  name: 'particles',
  category: 'effect',
  status: 'implemented',
  description: 'Floating particles (dust, embers, snow)',
  params: {
    kind: { default: 'dust', description: 'dust | embers | snow' },
    count: { default: 40, description: 'Particle count (perf-bounded)' },
    opacity: { default: 0.8, description: 'Overall layer opacity' },
    seed: { default: 7, description: 'Field seed' },
  },
  // Fully deterministic: the field is seeded-hash constants, per-frame motion
  // is pure trig of `t` in the renderer. This state object (with the CACHED
  // field reference) is the only per-frame allocation. An unknown kind falls
  // back to dust rather than rendering nothing — planner taste can't
  // accidentally disable the effect it asked for. Count is clamped to 120.
  apply(t, motion) {
    const opacity = clamp01(motion.params.opacity * motion.intensity);
    if (opacity <= 0) return null;
    const kind = PARTICLE_KINDS[motion.params.kind] ? motion.params.kind : 'dust';
    const count = Math.max(1, Math.min(Math.trunc(motion.params.count) || 1, 120));
    return {
      kind: 'particles',
      t,
      opacity,
      look: PARTICLE_KINDS[kind],
      field: getParticleField(kind, count, motion.params.seed),
    };
  },
});

motionRegistry.register('effect', {
  name: 'vignette',
  category: 'effect',
  status: 'implemented',
  description: 'Darkened frame edges focusing the eye',
  directions: ['in', 'out', 'hold'],
  params: {
    strength: { default: 0.4, description: 'Edge darkness 0–1' },
    spread: { default: 0.55, description: 'Where falloff begins (0 center, 1 edge)' },
    softness: { default: 0.45, description: 'Width of the falloff band' },
    color: { default: '0, 0, 0', description: 'Vignette RGB components' },
  },
  // One radial-gradient overlay; the envelope animates its opacity (the
  // global default 'in' eases the frame darker across the window; 'hold'
  // pins a constant vignette). Geometry stays static — animating gradient
  // stops would re-rasterize the layer every frame for no visible gain.
  apply(t, motion) {
    const opacity = clamp01(motion.params.strength * motion.intensity * envelope(t, motion));
    if (opacity < 0.01) return null;
    const spread = clamp01(motion.params.spread);
    return {
      kind: 'vignette',
      opacity,
      innerPct: Math.round(spread * 100),
      outerPct: Math.round(Math.min(spread + Math.max(motion.params.softness, 0.05), 1.45) * 100),
      color: motion.params.color,
    };
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
