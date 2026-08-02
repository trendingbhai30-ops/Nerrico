# Nerrico Motion Engine (NME)

> Architecture reference. Built in Phase 2A (2026-08-02). Implementations of the declared motions land in Phase 2B+.

## What it is

A style-agnostic motion framework for Remotion compositions. Every video style — documentary, finance, tech, history, luxury, minimal, dark, educational — describes motion through the same vocabulary (**specs** and **presets**) and the engine turns that into per-frame state. Styles decide *what* to render; the engine decides *how it moves*.

## Location & language

`backend/remotion/motion/` — motion executes inside Remotion's render bundle, so it lives beside the compositions. Plain JavaScript + JSDoc typedefs (the backend standard; runtime safety comes from normalization, not a compiler). Everything except `hooks.js` is framework-free and runs in Node — which is how it's tested without rendering.

```
backend/remotion/motion/
├── index.js            # public API (Node-safe; also triggers all registrations)
├── types.js            # JSDoc type contracts — the single source of truth for shapes
├── registry.js         # central registry: camera / transition / effect / preset
├── config.js           # GLOBAL_MOTION_DEFAULTS + resolveMotion()
├── timing.js           # easing curves + registerEasing() + motionProgress()
├── utils.js            # clamp/lerp/warnOnce/deepFreeze
├── hooks.js            # the ONLY Remotion-importing module (useCameraMotion, …)
├── camera/index.js     # zoom, pan, rotate, orbit, shake, focusPull
├── transitions/index.js# fade, slide, whip, flash, paperReveal, morph
├── effects/index.js    # filmGrain, blur, glow, noise, particles, vignette
└── presets/index.js    # slowZoom, fastZoom, documentaryPan, cinematicDrift, newsPush, heroReveal
```

## Core concepts

**MotionSpec** — what an author (preset, scene planner, style) writes. All fields optional: `preset`, `category`, `kind`, `durationInSeconds` (null = span the scene), `delayInSeconds`, `easing`, `direction`, `intensity` (strength multiplier), `speed` (time multiplier), `params` (kind-specific).

**MotionDefinition** — a registered kind with a param schema (defaults + descriptions) and a `status`: `'planned'` (declared, no code) or `'implemented'` (has a pure `apply(t, motion)` function). Adding a motion = one `register()` call + later one `apply` function. Nothing else changes.

**Preset** — a named MotionSpec. Configuration only, zero code. Presets are the stable vocabulary scene planners and prompts use (`"slowZoom"`), so taste can be retuned centrally without touching planner prompts or styles.

**ResolvedMotion** — output of `resolveMotion(spec)`. The merge happens **once per scene**:

```
GLOBAL_MOTION_DEFAULTS → preset config → definition param defaults → per-use spec
```

The result is frozen, has the easing pre-resolved to a function, and is the only thing per-frame code touches.

## The two-phase performance contract

1. **Resolve once per scene** — `resolveMotion()` does all lookups, merges, allocation.
2. **Per frame: numbers only** — `motionProgress(motion, frame, fps, sceneFrames)` → eased 0–1; `getCameraTransform(motion, t)` → frame state. No allocations on this path; identity states (`CAMERA_IDENTITY`, `TRANSITION_IDENTITY`) are shared frozen singletons. This is what makes hundreds of scenes cheap.

## Graceful degradation (render-safety)

Content input (planner output) can never crash a render:

- Unknown preset → defaults, one-time warning.
- Unknown kind → `def: null`, motion disabled.
- Planned-but-unimplemented camera/transition → identity (a static shot / a cut).
- Planned effect → `null` (overlay skipped).
- Unknown easing → linear. `speed: 0` → guarded to 1.

This means styles can adopt the NME API **now**; shots simply don't move until Phase 2B implements the kinds — no branching in style code.

## Timing engine

Built-in easings: `linear`, `easeIn`, `easeOut`, `easeInOut` (cubic), with CSS-style aliases (`ease-in-out` → `easeInOut`) accepted since planner/LLM output uses them. Custom curves plug in via `registerEasing(name, fn)` — the future home of cubic-bezier/spring/steps without touching any other module.

## Usage (Phase 2B+ pattern)

```jsx
// In a style composition:
import { useCameraMotion } from '../motion/hooks.js';

function Shot({ scene }) {
  const { transform } = useCameraMotion(scene.motion ?? 'slowZoom');
  return <AbsoluteFill style={{ transform }}>…</AbsoluteFill>;
}
```

```js
// In backend code (planner validation) — Node-safe, no React:
import { motionRegistry } from '../../remotion/motion/index.js';
motionRegistry.has('preset', shot.motion); // validate planner output
```

## Testing

`node scripts/test-motion.js` (from `backend/`) — 36 checks over registry contracts, easing math, resolution precedence, progress math (delay/speed/scene-span), dispatch fallbacks, and the shared-identity perf guarantee. Run it after any motion/ change.

## Phase 2B integration plan (not done yet)

- Implement camera `apply` functions (port `cameraTransform()` from `cinematic.jsx` into `zoom`/`pan` as the first two).
- Migrate `cinematic.jsx`'s hand-rolled Grain/vignette into `effects/` definitions.
- Drive scene wrappers in `Short.jsx` with `useTransitionMotion`.
- Extend the scene-planner prompt to emit preset names, validated against the registry in `src/core/scenes.js`.
