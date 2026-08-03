// Nerrico Motion Engine (NME) — transitions between scenes.
//
// A transition's `apply` receives eased progress and the phase ('in' on the
// entering scene, 'out' on the leaving scene) via motion.direction, and
// returns a TransitionState the style wraps its scene with (rendered by
// TransitionShell in hooks.js). All six kinds implemented as of Phase 2D-1.
//
// Scenes in Short.jsx never overlap, so every kind is designed as an
// ENTRANCE: the previous scene has already cut away and the new one animates
// in over the composition background. When a hook drives the 'out' phase it
// overwrites motion.direction with 'out' — spatial kinds then reverse their
// own progress (p = 1 − t) and animate back out along their default axis.

import { motionRegistry } from '../registry.js';
import { clamp01, warnOnce } from '../utils.js';

/** Neutral transition state (fully visible, untransformed). Shared + frozen. */
export const TRANSITION_IDENTITY = Object.freeze({
  opacity: 1,
  transform: '',
  filter: '',
  clipPath: '',
  overlay: null,
  filterDef: null,
});

motionRegistry.register('transition', {
  name: 'fade',
  category: 'transition',
  status: 'implemented',
  description: 'Opacity cross-fade',
  directions: ['in', 'out'],
  params: {},
  // Duration/easing/delay all come from the engine (resolveMotion +
  // motionProgress) — apply only maps eased progress to opacity.
  apply(t, motion) {
    return {
      opacity: motion.direction === 'out' ? 1 - t : t,
      transform: '',
      filter: '',
    };
  },
});

// Directions are TRAVEL directions ('up' = the scene moves upward into
// place, i.e. enters from below — matches the heroReveal preset's intent).
// The planner emits bare kind names (SceneMotion adds no direction), so a
// non-spatial direction like the global default 'in' falls back per kind.
const SLIDE_DIRS = ['left', 'right', 'up', 'down'];

// Reverse progress when a hook drives the 'out' phase (which overwrites the
// spatial direction) — the scene retraces its entrance.
const phased = (t, motion) => (motion.direction === 'out' ? 1 - t : t);

motionRegistry.register('transition', {
  name: 'slide',
  category: 'transition',
  status: 'implemented',
  description: 'Scene slides into place along an axis',
  directions: ['left', 'right', 'up', 'down'],
  params: {
    distancePct: { default: 100, description: 'Travel as % of frame size' },
    withFade: { default: true, description: 'Combine with opacity ramp' },
  },
  apply(t, motion) {
    const p = phased(t, motion);
    const dir = SLIDE_DIRS.includes(motion.direction) ? motion.direction : 'up';
    const off = motion.params.distancePct * motion.intensity * (1 - p);
    let x = 0;
    let y = 0;
    if (dir === 'up') y = off;
    else if (dir === 'down') y = -off;
    else if (dir === 'left') x = off;
    else x = -off;
    return {
      // Fade completes at ~70% of the travel so the settle lands at full
      // opacity — reads as "arriving", not "still appearing".
      opacity: motion.params.withFade ? clamp01(p * 1.4) : 1,
      transform: off < 0.01 ? '' : `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%)`,
      filter: '',
    };
  },
});

// Fixed SVG filter id for whip's directional blur. TransitionShell renders
// the def and the wrapper's `filter` references it — both come from the same
// state object, so the reference can never dangle within a frame. Only one
// scene is ever mounted at a time (Sequences don't overlap), so a single
// document-wide id is safe.
const WHIP_BLUR_ID = 'nme-whip-blur';

motionRegistry.register('transition', {
  name: 'whip',
  category: 'transition',
  status: 'implemented',
  description: 'Fast whip-pan entrance with directional motion blur',
  directions: ['left', 'right'],
  params: {
    blurPx: { default: 26, description: 'Peak directional blur' },
  },
  // A full-frame lateral snap: the scene travels 100% of the frame width
  // while a HORIZONTAL-only gaussian blur (real motion blur, not a defocus)
  // peaks mid-move via the 4p(1−p) parabola and drops to zero at both ends —
  // sub-0.5px blur skips the filter entirely, like focusPull's snap-to-0.
  apply(t, motion) {
    const p = phased(t, motion);
    const off = 100 * (1 - p);
    const blur = motion.params.blurPx * motion.intensity * 4 * p * (1 - p);
    const blurred = blur >= 0.5;
    return {
      opacity: 1,
      transform: off < 0.01 ? '' : `translate(${(motion.direction === 'right' ? -off : off).toFixed(3)}%, 0%)`,
      filter: blurred ? `url(#${WHIP_BLUR_ID})` : '',
      filterDef: blurred ? { id: WHIP_BLUR_ID, x: blur, y: 0 } : null,
    };
  },
});

motionRegistry.register('transition', {
  name: 'flash',
  category: 'transition',
  status: 'implemented',
  description: 'White/color flash over the cut',
  directions: ['in'],
  params: {
    color: { default: '#FFFFFF', description: 'Flash color' },
    peakOpacity: { default: 0.9, description: 'Flash strength at the peak' },
  },
  // The scene itself is fully visible throughout (a flash punctuates the cut,
  // it never hides content). The wash rises fast (first 30% of the move) and
  // dies off with a ^1.5 tail — the photographic pop-then-linger shape. At
  // both endpoints the overlay is null, so before/after frames pay nothing.
  apply(t, motion) {
    const p = phased(t, motion);
    const curve = p < 0.3 ? p / 0.3 : Math.pow(1 - (p - 0.3) / 0.7, 1.5);
    const opacity = clamp01(motion.params.peakOpacity * motion.intensity * curve);
    return {
      opacity: 1,
      transform: '',
      filter: '',
      overlay: opacity < 0.004 ? null : { color: motion.params.color, opacity },
    };
  },
});

// paperReveal's torn-edge silhouette: fixed per-vertex jag offsets in [−1, 1]
// from a sin-hash of the vertex index — NO RNG, so the tear is bit-identical
// on every render. The shape stays constant while the edge translates across
// the frame, which is exactly how a real tear looks.
const PAPER_DIRS = ['left', 'right', 'up', 'down'];
const PAPER_POINTS = 9;
const JAGS = Array.from({ length: PAPER_POINTS }, (_, i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
});

// Build the clip-path polygon for a torn edge at `edge` (% along the sweep
// axis) with jag amplitude `amp` (%). One string per frame — same budget as
// cameraTransformToCss.
function paperClip(dir, edge, amp) {
  const horizontal = dir === 'left' || dir === 'right';
  let pts = '';
  for (let i = 0; i < PAPER_POINTS; i++) {
    const e = (edge + JAGS[i] * amp).toFixed(2);
    const perp = ((i / (PAPER_POINTS - 1)) * 100).toFixed(2);
    // Horizontal sweeps trace the edge top→bottom; vertical sweeps trace it
    // right→left, so each polygon is one continuous outline.
    pts += horizontal ? `, ${e}% ${perp}%` : `, ${(100 - i / (PAPER_POINTS - 1) * 100).toFixed(2)}% ${e}%`;
    if (!horizontal) continue;
    void perp;
  }
  switch (dir) {
    case 'right':
      return `polygon(0% 0%${pts}, 0% 100%)`; // revealed = left of the edge
    case 'left':
      return `polygon(100% 0%${pts}, 100% 100%)`; // revealed = right of the edge
    case 'down':
      return `polygon(0% 0%, 100% 0%${pts})`; // revealed = above the edge
    default:
      return `polygon(0% 100%, 100% 100%${pts})`; // 'up': revealed = below the edge
  }
}

motionRegistry.register('transition', {
  name: 'paperReveal',
  category: 'transition',
  status: 'implemented',
  description: 'Torn paper edge sweeps across to reveal the scene',
  directions: ['left', 'right', 'up', 'down'],
  params: {
    edgeRoughness: { default: 1, description: 'How irregular the torn edge is' },
  },
  // The clip edge sweeps from −amp to 100+amp (% of the frame) so the jagged
  // silhouette is fully off-frame at both endpoints: p=0 shows nothing, p=1
  // returns the SHARED IDENTITY — the clip-path is dropped entirely once the
  // reveal completes, not left as a full-frame polygon.
  apply(t, motion) {
    const p = phased(t, motion);
    if (p >= 1) return TRANSITION_IDENTITY;
    const dir = PAPER_DIRS.includes(motion.direction) ? motion.direction : 'right';
    const amp = 7 * motion.params.edgeRoughness * motion.intensity;
    const forward = dir === 'right' || dir === 'down'; // sweep from the 0% side
    const edge = forward ? -amp + (100 + 2 * amp) * p : 100 + amp - (100 + 2 * amp) * p;
    return { opacity: 1, transform: '', filter: '', clipPath: paperClip(dir, edge, amp) };
  },
});

motionRegistry.register('transition', {
  name: 'morph',
  category: 'transition',
  status: 'implemented',
  description: 'Scene morphs into place — scale settle + soft blur resolving sharp',
  directions: ['in'],
  params: {
    fromScale: { default: 1.15, description: 'Starting scale the scene settles from' },
    blurPx: { default: 8, description: 'Starting softness, resolves to sharp' },
  },
  // Simple entrance-only morph (Phase 2D-1 scope): the scene arrives oversized
  // and soft, then settles to rest and resolves sharp — reads as the previous
  // shot "becoming" this one without any cross-scene element tracking. Plain
  // CSS blur (uniform, unlike whip's directional SVG blur, so no filterDef).
  // Sub-0.5px blur snaps to '' — same GPU-filter drop as whip/focusPull — and
  // p≥1 returns the SHARED IDENTITY so a settled scene costs nothing.
  apply(t, motion) {
    const p = phased(t, motion);
    if (p >= 1) return TRANSITION_IDENTITY;
    const scale = 1 + (motion.params.fromScale - 1) * motion.intensity * (1 - p);
    const blur = motion.params.blurPx * motion.intensity * (1 - p);
    return {
      // Fade front-loaded (done by 50% of the settle) — the morph reads as
      // motion, not as an appearance.
      opacity: clamp01(p * 2),
      transform: scale - 1 < 0.0005 ? '' : `scale(${scale.toFixed(4)})`,
      filter: blur < 0.5 ? '' : `blur(${blur.toFixed(2)}px)`,
    };
  },
});

/**
 * Transition frame state at eased progress `t`. Planned/unknown kinds return
 * TRANSITION_IDENTITY (scene simply visible — a cut), so an unimplemented
 * transition can never blank a render.
 * @param {import('../types.js').ResolvedMotion} motion
 * @param {number} t
 * @returns {import('../types.js').TransitionState}
 */
export function getTransitionState(motion, t) {
  const def = motion.def;
  if (!def || def.category !== 'transition') return TRANSITION_IDENTITY;
  if (!def.apply) {
    warnOnce(`transition-stub:${def.name}`, `Transition "${def.name}" is planned but not implemented — cut`);
    return TRANSITION_IDENTITY;
  }
  return def.apply(t, motion);
}
