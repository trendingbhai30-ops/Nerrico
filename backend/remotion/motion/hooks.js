// Nerrico Motion Engine (NME) — Remotion adapter.
//
// The ONLY motion module that imports React/Remotion. Everything else in
// motion/ is pure and testable in Node (see scripts/test-motion.js). Styles
// consume the engine through these hooks in Phase 2B+.

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveMotion } from './config.js';
import { motionProgress } from './timing.js';
import { CAMERA_IDENTITY, cameraTransformToCss, getCameraTransform } from './camera/index.js';
import { TRANSITION_IDENTITY, getTransitionState } from './transitions/index.js';
import { getEffectState } from './effects/index.js';
// Side-effect: register presets. Camera/transition/effect kinds register via
// the dispatch imports above, but nothing else here touches presets/ — without
// this, a composition importing only hooks.js gets "Unknown preset" at render.
import './presets/index.js';

/**
 * Resolve a motion spec once per scene mount. Cheap to call every render;
 * the heavy merge work is memoized on the spec reference.
 * @param {import('./types.js').MotionSpec | string | null} spec
 * @param {{category?: string}} [context]
 */
export function useResolvedMotion(spec, context) {
  return useMemo(() => resolveMotion(spec, context), [spec, context?.category]);
}

/**
 * Camera state + ready-to-use CSS transform for the current frame.
 * Identity (no movement) until the requested kind is implemented, so styles
 * can adopt this API today. Apply BOTH `transform` and `transformOrigin` to
 * the same wrapper so zoom focal points work.
 * @param {import('./types.js').MotionSpec | string | null} spec
 * @returns {{camera: import('./types.js').CameraTransform, transform: string, transformOrigin: string, t: number}}
 */
export function useCameraMotion(spec) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const motion = useResolvedMotion(spec, CAMERA_CONTEXT);
  const t = motionProgress(motion, frame, fps, durationInFrames);
  const camera = getCameraTransform(motion, t);
  return {
    camera,
    transform: cameraTransformToCss(camera),
    transformOrigin: camera.origin || '50% 50%',
    t,
  };
}

/**
 * Transition state for the current frame. `phase` is 'in' while a scene
 * enters, 'out' while it leaves (Short.jsx will drive this in Phase 2B).
 * @param {import('./types.js').MotionSpec | string | null} spec
 * @param {'in' | 'out'} [phase]
 * @returns {import('./types.js').TransitionState}
 */
export function useTransitionMotion(spec, phase = 'in') {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const motion = useResolvedMotion(spec, TRANSITION_CONTEXT);
  if (!motion.def) return TRANSITION_IDENTITY;
  const t = motionProgress(motion, frame, fps, durationInFrames);
  return getTransitionState(phase === 'out' ? { ...motion, direction: 'out' } : motion, t);
}

/**
 * Per-frame effect state for the current frame, or null when the effect
 * renders nothing (unimplemented kind, or intensity/opacity 0).
 * @param {import('./types.js').MotionSpec | string | null} spec
 * @returns {object|null}
 */
export function useEffectMotion(spec) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const motion = useResolvedMotion(spec, EFFECT_CONTEXT);
  if (!motion.def) return null;
  const t = motionProgress(motion, frame, fps, durationInFrames);
  return getEffectState(motion, t);
}

/**
 * Full-frame effect overlay component. Renders the overlay for the effect
 * the spec names, or nothing at all when the effect is off/unimplemented —
 * safe to include unconditionally. Effects are OPTIONAL by construction:
 * omit the element (or pass intensity: 0) and zero work happens.
 *
 * (Plain React.createElement, no JSX — hooks.js stays a .js module and the
 * only React-importing file in motion/.)
 * @param {{spec: import('./types.js').MotionSpec | string | null}} props
 */
export function MotionEffect({ spec }) {
  const state = useEffectMotion(spec);
  if (!state) return null;
  if (state.kind === 'filmGrain') return renderFilmGrain(state);
  return null;
}

const h = React.createElement;
function renderFilmGrain(state) {
  // One SVG turbulence-filtered rect — the same lightweight technique as
  // cinematic.jsx's production Grain. seed comes from the engine (deterministic).
  return h(
    AbsoluteFill,
    { style: { opacity: state.opacity, mixBlendMode: 'overlay', pointerEvents: 'none' } },
    h(
      'svg',
      { width: '100%', height: '100%' },
      h(
        'filter',
        { id: 'nme-film-grain' },
        h('feTurbulence', {
          type: 'fractalNoise',
          baseFrequency: state.baseFrequency,
          numOctaves: 2,
          seed: state.seed,
          stitchTiles: 'stitch',
        }),
        h('feColorMatrix', { type: 'saturate', values: '0' })
      ),
      h('rect', { width: '100%', height: '100%', filter: 'url(#nme-film-grain)' })
    )
  );
}

// Stable context objects so useMemo deps don't churn.
const CAMERA_CONTEXT = Object.freeze({ category: 'camera' });
const TRANSITION_CONTEXT = Object.freeze({ category: 'transition' });
const EFFECT_CONTEXT = Object.freeze({ category: 'effect' });

export { CAMERA_IDENTITY, TRANSITION_IDENTITY };
