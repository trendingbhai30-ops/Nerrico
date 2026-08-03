# Nerrico Motion Engine (NME)

> Architecture reference. Built in Phase 2A (2026-08-02). Phase 2B implemented the first four motions — camera `zoom` + `pan`, transition `fade`, effect `filmGrain` (proven by the `MotionDemo` composition). Phase 2.5 integrated the engine into the production pipeline: the styles, `Short.jsx`, the scene planner, and validation all run through it. Phase 2C completed the camera library — all 7 camera kinds implemented (proven by the `CameraDemo` composition). Phase 2D-1 completed the transition library — all 6 transitions implemented (proven by the `TransitionDemo` composition). Remaining effects land in Phase 2D-2.

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
├── camera/index.js     # zoom, pan, rotate, orbit, push, shake, focusPull (ALL implemented)
├── transitions/index.js# fade, slide, whip, flash, paperReveal, morph (ALL implemented)
├── effects/index.js    # filmGrain (implemented); blur, glow, noise, particles, vignette (planned)
└── presets/index.js    # slowZoom, fastZoom, documentaryPan, cinematicDrift, newsPush, slowRoll,
                        # pushIn, pullBack, impactShake, rackFocus (camera) + heroReveal (transition)
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

`node scripts/test-motion.js` (from `backend/`) — 124 checks over registry contracts, easing math, resolution precedence, progress math (delay/speed/scene-span), dispatch fallbacks, the shared-identity perf guarantee, and the implemented motions' math (zoom/pan/fade/filmGrain, the Phase 2C camera library: rotate ramps and mirroring, orbit anchoring/quarter-turn/return-home, push hyperbolic acceleration and clamping, shake determinism/seeding/decay-to-rest, focusPull blur ramps and snap-to-0, and the Phase 2D-1 transition library: slide travel/fade-completion/out-retrace, whip off-frame start/mid-move directional blur/clean landing, flash rise-peak-decay and endpoint-null overlays, paperReveal deterministic tear and completion-to-shared-identity, morph settle/blur-snap/identity — plus "every camera preset offered to the planner resolves to an implemented kind" and "every registered transition is implemented"). The script prints its own count — keep docs in sync with that output. Run it after any motion/ change.

`node scripts/render-motion-demo.js` (from `backend/`, needs no server) — renders the `MotionDemo` composition (4 labeled segments: slow zoom, pan, fade, film grain) plus verification stills to `data/motion-demo/`. This is the visual proof that implemented motions work end-to-end in a real render.

`node scripts/render-camera-demo.js` (from `backend/`, needs no server) — renders the `CameraDemo` composition (6 labeled segments: rotate, orbit, push in, pull out, focus pull, shake) plus 2 verification stills per segment to `data/camera-demo/`. Visual proof of the Phase 2C camera library.

`node scripts/render-transition-demo.js` (from `backend/`, needs no server) — renders the `TransitionDemo` composition (6 labeled segments: slide, whip, flash, paperReveal, morph, heroReveal-as-preset) plus 3 verification stills per segment (early / mid-transition / settled) to `data/transition-demo/`. Visual proof of the Phase 2D-1 transition library, including the `TransitionShell` render path.

**Frame-extraction gotcha**: Remotion's bundled ffmpeg (the only ffmpeg on this machine) has no `bmp` encoder and no `rawvideo` muxer — extract frames as `.png` only, and do pixel comparisons in Node with `pngjs` (already in backend node_modules).

`node scripts/test-motion-pipeline.js` (from `backend/`, needs no server) — Phase 2.5 integration test: real planner output through `validateShots` (invalid motion names must be stripped), registry resolution + timing in pure Node, then real Remotion stills through the `Short` composition for a legacy fixture (camera-only, pre-2.5 project shape) and a preset fixture. `--stills-only <name>` renders just the legacy-fixture stills to `data/motion-pipeline/<name>/` — used to capture `baseline/` before the style migrations; `current/` must match it (grain noise aside) after any motion/ or style change.

## Integration (done in Phase 2.5)

The engine is now the production motion path end-to-end:

- **Planner** — `shotsPrompt` (`src/content/prompts.js`) emits `motion` (preset), `transition`, and `effect` per shot. The offered vocabulary is generated from the registry and filtered to **implemented** kinds (`cameraPresetLegend`/`implementedLegend`), so it grows automatically as kinds are implemented and never offers a preset that would degrade to a static shot. Legacy `camera` stays as fallback.
- **Validation** — `validateShots` (`src/core/scenes.js`) checks each emitted name with `motionRegistry.has()`; unknown names are stripped to `null` before they can reach a render.
- **`Short.jsx`** — a `SceneMotion` wrapper applies the planner's entrance transition (0.4 s default) + full-frame effect to every scene of every style; absent fields resolve to the shared identity state, so pre-2.5 projects render unchanged.
- **Cinematic** — hand-rolled `cameraTransform`/Grain/fade replaced by exact-port NME specs (`LEGACY_CAMERA_SPECS`, legacy curve registered as `quadInOut`, `GRAIN_DARK`/`GRAIN_PAPER`, `FADE_IN_SPEC`); planner presets honored per shot with designed-scene `amp` scaling the preset intensity.
- **Vox** — PhotoScene Ken Burns replaced by `KEN_BURNS_SPEC` (linear zoom 1 → 1.07).

Migration proven behaviour-preserving by pixel-comparing `data/motion-pipeline/current/` against the pre-migration `baseline/` (max delta ≤ 7/255 — grain/AA noise only).

## Camera library (completed in Phase 2C)

All 7 camera kinds are implemented: zoom, pan (Phase 2B), rotate, orbit, **push** (a new kind added in 2C — physical dolly using CSS-perspective math `scale = P/(P−z)`, hyperbolically accelerating unlike zoom's linear ramp), shake (seeded sum-of-sines, deterministic, decays to exact rest), focusPull (blur ramp + lens-breathing zoom, rendered via the `filter` string `useCameraMotion` now returns — apply it alongside `transform`/`transformOrigin` if a style should support rack focus). 10 camera presets are in the planner vocabulary: slowZoom, fastZoom, documentaryPan, newsPush, cinematicDrift, slowRoll, pushIn, pullBack, impactShake, rackFocus.

## Transition library (completed in Phase 2D-1)

All 6 transitions are implemented: fade (Phase 2B), **slide** (axis travel with a fade that completes at ~70% of the move so the settle reads as "arriving"), **whip** (full-frame lateral snap with a horizontal-only SVG gaussian blur that peaks mid-move via the 4p(1−p) parabola — real directional motion blur, dropped entirely below 0.5px), **flash** (white/color wash OVER the fully-visible scene — fast rise to 30%, ^1.5 decay tail; overlay is `null` at both endpoints), **paperReveal** (torn-edge clip-path sweep; fixed sin-hash jag offsets so the tear is bit-identical every render; completes to the SHARED identity so a settled scene drops the clip), **morph** (simple entrance-only: scene arrives oversized and soft — scale 1.15 → 1, blur 8px → 0 with snap-to-0 — and resolves sharp).

Scenes in `Short.jsx` never overlap, so every kind is designed as an **entrance**; when a hook drives the `'out'` phase, spatial kinds reverse their own progress and retrace their entrance.

**`TransitionState` grew in 2D-1** (all new fields optional/benign on old states): `clipPath` (paperReveal), `overlay` `{color, opacity}` (flash), `filterDef` `{id, x, y}` (whip's directional blur — the def the shell must render so `filter: url(#id)` resolves). **`TransitionShell`** (`motion/hooks.js`) is the ONE component that maps a full `TransitionState` to rendered CSS — `Short.jsx`'s `SceneMotion` wraps every scene with it, with a DOM shape that stays constant across frames so slots appearing/disappearing never remount the scene subtree. Styles should wrap with `TransitionShell` rather than hand-applying state fields.

**Transition presets in the planner** — the `"transition"` field now accepts a transition kind (`"slide"`) or a transition-category preset (`"heroReveal"`): offered by `transitionLegend()` (`src/content/prompts.js`), validated by `transitionOrNull()` (`src/core/scenes.js`, camera/effect presets still rejected), and resolved as preset shorthand in `SceneMotion` (a preset carries its own duration/easing; bare kinds get the 0.4 s default).

## Phase 2D-2 plan (not done yet)

Implement the remaining effects: blur/glow/noise/particles/vignette. Each is one `apply` function on its existing definition plus a renderer branch in `MotionEffect` (hooks.js) — the planner prompt, validation, and style wiring above pick each one up automatically.
