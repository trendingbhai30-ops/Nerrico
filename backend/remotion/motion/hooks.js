// Nerrico Motion Engine (NME) — Remotion adapter.
//
// The ONLY motion module that imports React/Remotion. Everything else in
// motion/ is pure and testable in Node (see scripts/test-motion.js). Styles
// consume the engine through these hooks in Phase 2B+.

import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveMotion } from './config.js';
import { motionProgress } from './timing.js';
import { CAMERA_IDENTITY, cameraTransformToCss, getCameraTransform } from './camera/index.js';
import { TRANSITION_IDENTITY, getTransitionState } from './transitions/index.js';

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
 * can adopt this API today.
 * @param {import('./types.js').MotionSpec | string | null} spec
 * @returns {{camera: import('./types.js').CameraTransform, transform: string, t: number}}
 */
export function useCameraMotion(spec) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const motion = useResolvedMotion(spec, CAMERA_CONTEXT);
  const t = motionProgress(motion, frame, fps, durationInFrames);
  const camera = getCameraTransform(motion, t);
  return { camera, transform: cameraTransformToCss(camera), t };
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

// Stable context objects so useMemo deps don't churn.
const CAMERA_CONTEXT = Object.freeze({ category: 'camera' });
const TRANSITION_CONTEXT = Object.freeze({ category: 'transition' });

export { CAMERA_IDENTITY, TRANSITION_IDENTITY };
