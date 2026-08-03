// Nerrico Motion Engine (NME) — type contracts.
//
// The backend is plain JavaScript (see DEVELOPMENT_GUIDE.md), so "types" are
// JSDoc typedefs: they give editors/`tsc --checkJs` full IntelliSense while
// runtime safety comes from normalization in config.js (resolveMotion) and
// registry validation. Every module in motion/ imports its contracts from
// this file's typedefs — treat this as the engine's single source of truth
// for shapes.

/**
 * Motion categories understood by the engine.
 * @typedef {'camera' | 'transition' | 'effect'} MotionCategory
 */

/**
 * What an author (scene planner, preset, or style) writes to request motion.
 * Everything is optional — unspecified fields fall back through:
 *   per-use spec → preset config → definition param defaults → global defaults.
 *
 * @typedef {Object} MotionSpec
 * @property {string} [preset]      Name of a registered preset (e.g. 'slowZoom').
 * @property {MotionCategory} [category]  Motion category; usually implied by preset/kind.
 * @property {string} [kind]        Registered motion kind (e.g. 'zoom', 'fade', 'filmGrain').
 * @property {number|null} [durationInSeconds]  Motion length. `null` = span the whole scene.
 * @property {number} [delayInSeconds]  Seconds to wait (within the scene) before starting.
 * @property {string} [easing]      Easing name: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
 *                                  (CSS-style aliases 'ease-in' etc. accepted), or any
 *                                  custom easing registered via registerEasing().
 * @property {string} [direction]   Kind-specific direction: 'in'|'out'|'left'|'right'|'up'|'down'|'cw'|'ccw'.
 * @property {number} [intensity]   Strength multiplier. 1 = the kind's designed strength;
 *                                  0.5 = subtle; 2 = exaggerated. Kinds scale their own params by it.
 * @property {number} [speed]       Time multiplier. 2 = twice as fast (halves effective duration).
 * @property {Object<string, *>} [params]  Kind-specific parameters (see each definition's `params` schema).
 */

/**
 * A registered motion definition. Phase 2A registers definitions with
 * `status: 'planned'` and no `apply`; Phase 2B+ fills in `apply`.
 *
 * @typedef {Object} MotionDefinition
 * @property {string} name          Unique kind name within its category.
 * @property {MotionCategory} category
 * @property {'implemented' | 'planned'} status
 * @property {string} description   One line: what this motion looks like.
 * @property {string[]} [directions]  Directions this kind accepts.
 * @property {Object<string, {default: *, description: string}>} params
 *                                  Parameter schema WITH defaults — the only
 *                                  place a kind's tunables are declared.
 * @property {ApplyFn} [apply]      Pure per-frame function. Absent while planned;
 *                                  dispatchers then return the category's identity state.
 */

/**
 * Pure per-frame motion function. MUST be allocation-light: called once per
 * frame per motion for potentially hundreds of scenes.
 * @callback ApplyFn
 * @param {number} t                Eased progress 0→1 (already delayed/eased/speed-adjusted).
 * @param {ResolvedMotion} motion   Fully resolved, frozen motion (read params/intensity/direction from it).
 * @returns {Object}                Category-specific frame state (see CameraTransform / TransitionState).
 */

/**
 * Output of resolveMotion() — computed ONCE per scene, then reused every
 * frame. Per-frame code must only do number math on this frozen object.
 *
 * @typedef {Object} ResolvedMotion
 * @property {MotionCategory|null} category
 * @property {string|null} kind
 * @property {MotionDefinition|null} def   Registered definition, if any.
 * @property {number|null} durationInSeconds
 * @property {number} delayInSeconds
 * @property {string} easing
 * @property {(t: number) => number} easingFn  Pre-resolved easing function.
 * @property {string} direction
 * @property {number} intensity
 * @property {number} speed
 * @property {Object<string, *>} params    Definition defaults ← preset ← spec, merged + frozen.
 */

/**
 * Camera frame state. `getCameraTransform` returns CAMERA_IDENTITY (shared,
 * frozen) for planned kinds, so callers never need null checks.
 * @typedef {Object} CameraTransform
 * @property {number} scale
 * @property {number} x        px
 * @property {number} y        px
 * @property {number} rotate   deg
 * @property {number} blur     px (focus pull)
 * @property {string} [origin] CSS transform-origin (zoom focal point). Absent = '50% 50%'.
 */

/**
 * Transition frame state, applied to the incoming/outgoing scene wrapper.
 * Phase 2D-1 extended the shape; every field beyond opacity/transform/filter
 * is optional and absent/benign on older states (fade emits only the first
 * three), so existing consumers never break. `TransitionShell` (hooks.js) is
 * the one place that maps ALL of these to rendered CSS.
 * @typedef {Object} TransitionState
 * @property {number} opacity
 * @property {string} transform   CSS transform fragment ('' = none).
 * @property {string} filter      CSS filter fragment ('' = none). May reference
 *                                an SVG filter by url(#id) — then `filterDef`
 *                                MUST describe it so the def gets rendered.
 * @property {string} [clipPath]  CSS clip-path ('' = none; paperReveal).
 * @property {{color: string, opacity: number}|null} [overlay]
 *                                Full-frame color wash above the scene (flash).
 * @property {{id: string, x: number, y: number}|null} [filterDef]
 *                                Directional gaussian blur def the shell must
 *                                render for `filter`'s url() to resolve (whip).
 */

/**
 * A preset: a named, reusable MotionSpec — configuration only, no code.
 * @typedef {Object} MotionPreset
 * @property {string} name
 * @property {string} description
 * @property {MotionSpec} config
 */

export {}; // pure typedef module — nothing to export at runtime
