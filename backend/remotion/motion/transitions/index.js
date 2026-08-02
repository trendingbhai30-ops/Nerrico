// Nerrico Motion Engine (NME) — transitions between scenes.
//
// Phase 2A: vocabulary + dispatch contract only. A transition's `apply`
// receives eased progress and the phase ('in' on the entering scene, 'out'
// on the leaving scene) via motion.direction, and returns a TransitionState
// the style wraps its scene with. Implementations land in Phase 2B+.

import { motionRegistry } from '../registry.js';
import { warnOnce } from '../utils.js';

/** Neutral transition state (fully visible, untransformed). Shared + frozen. */
export const TRANSITION_IDENTITY = Object.freeze({ opacity: 1, transform: '', filter: '' });

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

motionRegistry.register('transition', {
  name: 'slide',
  category: 'transition',
  status: 'planned',
  description: 'Scene slides in/out along an axis',
  directions: ['left', 'right', 'up', 'down'],
  params: {
    distancePct: { default: 100, description: 'Travel as % of frame size' },
    withFade: { default: true, description: 'Combine with opacity ramp' },
  },
});

motionRegistry.register('transition', {
  name: 'whip',
  category: 'transition',
  status: 'planned',
  description: 'Fast whip-pan with motion blur',
  directions: ['left', 'right'],
  params: {
    blurPx: { default: 26, description: 'Peak directional blur' },
  },
});

motionRegistry.register('transition', {
  name: 'flash',
  category: 'transition',
  status: 'planned',
  description: 'White/color flash cut',
  directions: ['in'],
  params: {
    color: { default: '#FFFFFF', description: 'Flash color' },
    peakOpacity: { default: 0.9, description: 'Flash strength at midpoint' },
  },
});

motionRegistry.register('transition', {
  name: 'paperReveal',
  category: 'transition',
  status: 'planned',
  description: 'Torn/peeled paper edge reveals the next scene (Vox/collage styles)',
  directions: ['left', 'right', 'up', 'down'],
  params: {
    edgeRoughness: { default: 1, description: 'How irregular the torn edge is' },
  },
});

motionRegistry.register('transition', {
  name: 'morph',
  category: 'transition',
  status: 'planned',
  description: 'Shared-element scale/position morph between scenes',
  directions: ['in'],
  params: {},
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
