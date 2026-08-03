# CHANGELOG.md

All completed phases and major architectural changes, newest first. Add an entry every time a phase completes or the architecture shifts.

---

## 2026-08-03 — Phase 2D-1: Motion Transitions ✅

Every transition in the NME vocabulary is now implemented — the transition library is complete (6 kinds, all `status: 'implemented'`). Additive: `apply` functions on existing definitions, one new render component, zero architecture changes. (Work spanned two sessions — an API-limit interruption left slide/whip/flash/paperReveal + the `TransitionState` extension done; this session recovered state and finished the rest.)

- **Transition `slide`**: axis travel (`left/right/up/down`, travel-direction semantics) of `distancePct` with an opacity ramp that completes at ~70% of the move — the settle lands at full opacity, so it reads as "arriving", not "still appearing". `withFade: false` for pure travel.
- **Transition `whip`**: full-frame lateral snap with a HORIZONTAL-only SVG gaussian blur (real directional motion blur, not a defocus) peaking mid-move via the 4p(1−p) parabola; sub-0.5px blur drops the filter entirely, and both endpoints are filter-free.
- **Transition `flash`**: white/color wash OVER the fully-visible scene (a flash punctuates the cut, never hides content) — fast rise across the first 30%, ^1.5 decay tail; the overlay object is `null` at both endpoints so before/after frames pay nothing.
- **Transition `paperReveal`**: torn-paper clip-path sweep — fixed sin-hash per-vertex jags (NO RNG, bit-identical every render), edge sweeps from fully-off to fully-off, and completion returns the SHARED identity so the clip is dropped once revealed.
- **Transition `morph`** (simple entrance-only per phase scope): scene arrives oversized and soft (scale 1.15 → 1, blur 8px → 0 with snap-to-0) with a front-loaded fade — reads as the previous shot becoming this one.
- **`TransitionState` extended** (`types.js`): optional `clipPath`, `overlay {color, opacity}`, `filterDef {id, x, y}` — absent/benign on older states, so existing consumers never break.
- **New `TransitionShell`** (`motion/hooks.js`): the ONE component mapping a full TransitionState to CSS (wrapper + whip's SVG blur def + flash's wash overlay), with a frame-constant DOM shape so slots appearing mid-transition never remount the scene subtree. `Short.jsx`'s `SceneMotion` now uses it instead of hand-applying fields (which silently dropped the new state).
- **heroReveal preset now reachable**: the `"transition"` field accepts kinds or transition-category presets — offered by `transitionLegend()` (prompts.js), validated by `transitionOrNull()` (scenes.js; camera/effect presets still rejected), resolved as preset shorthand in `SceneMotion` (a preset keeps its own duration/easing; bare kinds get the 0.4 s default). Prompt vocabulary grew automatically per the Phase 2.5 design: slide, whip, flash, paperReveal, morph + heroReveal all verified IN PROMPT.
- **TransitionDemo**: `remotion/TransitionDemo.jsx` (6 labeled segments reusing MotionDemo's Backdrop/Label; zero hand-rolled animation math) + `scripts/render-transition-demo.js` → `data/transition-demo/` mp4 + 18 stills (early/mid/settled per segment). Frame-verified: whip's directional blur, paper's torn edge, flash's wash, morph's soft settle all visually confirmed.
- **Validated**: motion smoke test **124/124** (was 90; adds per-transition math + "every registered transition is implemented"; the planned-transition fallback contract now proven with a synthetic test-only kind), pipeline test 13/13, baseline pixel-compare max per-channel delta 8/255 (grain/AA noise — legacy path untouched), fresh server + all endpoints healthy, full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning only. NOT committed — awaiting user approval.

---

## 2026-08-02 — Phase 2C: Advanced Camera Motion Library ✅

Every camera kind in the NME vocabulary is now implemented — the camera library is complete (7 kinds, all `status: 'implemented'`). Purely additive: one new kind + `apply` functions on existing definitions; zero architecture changes.

- **Camera `rotate`**: slow roll around a configurable pivot (`origin`), linear ramp 0 → ±`degrees`, constant `holdScale` keeps corners covered (~±7° at the default 1.12).
- **Camera `orbit`**: parametric-ellipse drift — θ sweeps ±`revolutions`·2π and position is offset by (cos θ − 1, sin θ), so t=0 is exactly (0,0) (no mount jump) and a full revolution returns home. Pure trig of eased progress, zero state. Unlocks the `cinematicDrift` preset.
- **Camera `push`** (NEW kind, 7th in the registry): physical dolly via CSS-perspective math — `scale = P/(P−z)`, so growth accelerates hyperbolically as the camera closes in (vs zoom's linear lerp). `out` settles back to exactly scale 1 (no edge reveal); travel clamped to 0.85·P so hostile params can't reach infinite scale.
- **Camera `shake`**: seeded sum-of-sines noise (NOT random) — deterministic per seed, incommensurate frequency ratios prevent visible looping, `(1−t)^(3·decay)` envelope starts at full impact and lands at exact rest (displacement AND micro-roll).
- **Camera `focusPull`**: rack-focus blur ramp (7px → 0 by default, direction-swappable) + lens-breathing zoom; blur below 0.05px snaps to 0 so the sharp end drops the GPU filter entirely. `useCameraMotion` now returns `filter`; cinematic's three camera-driven scenes apply it.
- **5 new presets** (11 total, 10 camera): slowRoll, pushIn, pullBack, impactShake, rackFocus. The Phase 2.5 registry-sourced planner vocabulary picked all of them up with zero prompt-code changes.
- **CameraDemo**: `remotion/CameraDemo.jsx` (6 labeled segments reusing MotionDemo's exported Backdrop/CameraSegment; zero hand-rolled animation math) + `scripts/render-camera-demo.js` → `data/camera-demo/` mp4 + 12 stills. Frame-verified.
- **FFmpeg investigation**: `.bmp` frame extraction fails ("Automatic encoder selection failed … codec bmp … Encoder not found") because Remotion's bundled ffmpeg — the only ffmpeg on the machine — is a minimal build with `--disable-encoders` and an allowlist (png, mjpeg, libx264/x265, …) that omits bmp; its muxer list also omits rawvideo. Not a Motion Engine regression and nothing to fix: renders use libx264 and stills use png, both compiled in. Rule: extract frames as `.png`; pixel-compare with `pngjs` (already in backend node_modules).
- **Validated**: motion smoke test **90/90** (was 56; includes per-kind math checks + "every camera preset the planner is offered resolves to an implemented kind"), pipeline test 13/13, baseline pixel-compare max per-channel delta 8/255 (grain/AA noise, no structural change), fresh server + all endpoints healthy, full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint no new warnings.

---

## 2026-08-02 — Phase 2.5: Motion Engine Integration ✅

The NME went from proven-in-isolation to wired into the production pipeline: planner → validation → registry → engine → render. No new motions implemented (that's Phase 2C); all migrations are exact ports proven frame-identical against a captured baseline.

- **Registry validation** (`src/core/scenes.js`): `validateShots` accepts planner-emitted `motion` (preset) / `transition` / `effect`, each checked via `motionRegistry.has()` — unknown names stripped to `null` (legacy `camera` fallback), so invalid planner output can never reach a render.
- **Cinematic migration** (`styles/cinematic.jsx`): hand-rolled `cameraTransform`/Grain/fade-in replaced by the engine. Exact legacy ports (`LEGACY_CAMERA_SPECS`, old quad curve registered as `quadInOut`), designed-scene `amp` → NME `intensity`, grain via `MotionEffect`, scene fade via `useTransitionMotion`. Planner presets honored per shot with `amp`-scaled intensity on designed scenes.
- **Vox migration** (`scenes.jsx`): PhotoScene Ken Burns → `KEN_BURNS_SPEC` (exact port: linear 1 → 1.07).
- **`Short.jsx` `SceneMotion` wrapper**: planner-emitted entrance transition (0.4 s) + full-frame effect for every style; absent fields resolve to the shared identity state — pre-2.5 projects render unchanged.
- **Planner emission** (`content/prompts.js`): `shotsPrompt` now offers `motion`/`transition`/`effect` with vocabulary sourced live from the registry, filtered to implemented kinds only (slowZoom/fastZoom/documentaryPan/newsPush, fade, filmGrain) — the prompt grows automatically as Phase 2C lands. Legacy `camera` kept as fallback.
- **Integration test** `scripts/test-motion-pipeline.js`: 13 checks (validation stripping, registry resolution, timing) + real Remotion stills of a legacy fixture and a preset fixture; `--stills-only` captured the pre-migration baseline.
- **Visual comparison**: post-migration stills vs baseline — max pixel delta ≤ 7/255 (grain/AA noise only), migration behaviour-preserving; preset path shows real camera travel.
- **Validated**: motion test 56/56, pipeline test 13/13, fresh server + all endpoints healthy, full vox re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint no new warnings, both dev servers healthy.

---

## 2026-08-02 — Phase 2B: First Motion Implementations (PoC) ✅

The first four NME motions went from `status: 'planned'` to `'implemented'` — purely by adding `apply` functions to the existing Phase 2A definitions. No architecture changes; production styles untouched.

- **Camera `zoom`**: scale ramp startScale→endScale (swapped for direction `out`), vertical drift, configurable `origin` focal point (new param; `useCameraMotion` now also returns `transformOrigin`). Math ported from `cinematic.jsx` `cameraTransform()` — identical output at defaults with `intensity` as the old `amp`.
- **Camera `pan`**: left/right/up/down travel of `distancePx` centered on 0, constant `holdScale` zoom, perpendicular `tiltPx` hand-held drift.
- **Transition `fade`**: opacity ramp (in: t, out: 1−t); duration/delay/easing all come from the engine.
- **Effect `filmGrain`**: same single-SVG-turbulence-rect technique as cinematic's proven Grain; seed derived from eased progress → animated but fully deterministic; `intensity: 0` returns null (overlay skipped). New `useEffectMotion` hook + `MotionEffect` overlay component in hooks.js (still the only React module, JSX-free via `createElement`).
- **Bug found & fixed**: compositions importing only `hooks.js` never ran the preset registrations ("Unknown preset slowZoom" in the render bundle) — hooks.js now side-effect-imports `presets/index.js`.
- **MotionDemo**: minimal validation composition (`remotion/MotionDemo.jsx`, registered in Root.jsx) — 4 labeled 3s segments (slow zoom, pan left, fade in+out, film grain) over a procedural grid; zero animation math outside the engine. `scripts/render-motion-demo.js` renders mp4 + 8 stills to `data/motion-demo/`. Frame-verified.
- **Validated**: motion smoke test extended to 56 checks (all pass), demo RENDER OK + frames inspected, full regression re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning, both dev servers healthy.

## 2026-08-02 — Phase 2A: Motion Engine Foundation (NME) ✅

Style-agnostic motion framework at `backend/remotion/motion/`. Purely additive — zero changes to existing compositions, pipeline, or API. Architecture doc: `docs/motion-engine.md`.

- **Core**: central registry (camera/transition/effect/preset categories, frozen definitions, pluggable via one `register()` call), JSDoc type contracts (`types.js`), config resolution chain — global defaults → preset → definition param defaults → per-use spec — computed once per scene (`resolveMotion`), timing engine (linear/easeIn/easeOut/easeInOut, CSS-alias tolerant, `registerEasing()` for future custom curves), zero-allocation per-frame progress math (`motionProgress` with delay/speed/scene-span semantics).
- **Declared vocabulary** (config + param schemas only, `status: 'planned'`, no implementations by design): camera zoom/pan/rotate/orbit/shake/focusPull; transitions fade/slide/whip/flash/paperReveal/morph; effects filmGrain/blur/glow/noise/particles/vignette; presets slowZoom/fastZoom/documentaryPan/cinematicDrift/newsPush/heroReveal.
- **Render-safety**: unknown/unimplemented motion degrades to shared frozen identity states (static shot / cut / skipped overlay) with one-time warnings — planner output can never crash a render.
- **Remotion adapter**: `hooks.js` (`useCameraMotion`, `useTransitionMotion`) is the only React-importing module; everything else is Node-testable.
- **Test**: `scripts/test-motion.js` — 36 checks (registry contracts, easing math, resolution precedence, progress math, dispatch fallbacks, shared-identity perf guarantee), all passing.
- **Validated**: live server endpoints healthy, full standalone re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning only.
- Next (2B): implement `apply` functions (port `cinematic.jsx` `cameraTransform` → zoom/pan first), migrate Grain/vignette into effects, wire transitions into `Short.jsx`, planner emits preset names validated against the registry.

## 2026-08-02 — Phase 1: SaaS Foundation Refactor ✅

Full backend architecture refactor, behavior preserved (prompts byte-identical).

- Backend `lib/` → layered `src/`: `config/` (env.js = sole reader of `process.env`, constants.js), `utils/` (scoped logger + LOG_LEVEL, HttpError, extractJson, download), `providers/` (claude.js with `askClaudeJson` retry helper, elevenlabs.js, images/ one-file-per-provider + registry, stock.js, commons.js), `content/` (modes/styles/voices/prompts/branding), `core/` (store/pipeline/scenes/slides/render), `api/` (app.js, routes/{meta,voices,projects}.js, central error middleware).
- New entry point `src/server.js`; old root `server.js` deleted; `scripts/` imports updated.
- `.env.example` added on both sides. Frontend: `VITE_API_BASE_URL` support (localStorage still wins), `config/constants.ts`, `utils/{errors,format}.ts`, full API types, zero `any`.
- Validated: tsc + vite build clean, oxlint (1 pre-existing warning), server E2E smoke on all endpoints, full re-render of `d2fe791fdb84` OK.
- Pre-refactor backup: `nerrico-pre-phase1-backup.tgz`.

## 2026-08-01 (evening) — Cinematic Engine + Visual-First Redesign ✅

- New style `cinematic` (reels only): documentary look — AI images per shot, Ken Burns/parallax, grain/grade, sparse serif captions with red emphasis, progress bar, branded end card.
- **Visual-first fallback chain** per shot: AI image (Gemini if keyed, else Pollinations.ai — keyless, flux, deterministic seed) → stock (`lib/stock.js`: Pexels/Pixabay → Openverse → Commons) → icon/illustration scene (planner emits emoji, `IconComposition`) → text as last resort. Text-only scenes banned.
- Shot planner outputs imagePrompt + stock query + icons + caption + emphasis + camera per shot.
- E2E verified: `15b3f0cf3a03` (Blockbuster/Netflix, 51.8s, 16 shots, all Pollinations images, frame-verified) and `c54ed751b120` (realestate/hinglish, 62.2s, 14 shots, Adam voice via `eleven_multilingual_v2`).
- Fixed: asset endpoint whitelist now allows `shot-N.(png|jpg)`.
- Findings: Gemini free tier now has 0 image quota/day (key valid but unusable); ElevenLabs library voices blocked on free tier (402) — premade voices only.

## 2026-08-01 — Major Redirection: Cinematic Documentary Style

- User pivoted from text-animation reels to a cinematic documentary engine, based on a reference video ("Moon"-channel style): AI-generated photorealistic stills, camera moves, sparse captions, dark grade, ~1.5–3s shots.
- Kastoori logo added (`config/kastoori-logo.png` — dark background, not transparent) + business facts stored as LLM context only (never pitched in content).
- Dev strategy locked in: complete E2E first, polish later; don't stop after small features; ask rather than assume. SFX/music officially skipped.

## 2026-08-01 (night of 07-31) — Real Estate Mode ✅

- Second content mode `realestate` ("Kastoori Real Estate"): Indian buyer/investor tips, no ads in script, branding applied visually.
- New systems: `modes.js` (normal/realestate × english/hinglish × reel/carousel), `styles.js` + `remotion/styles/` (extracted `vox`; new `luxury`: charcoal/cream/gold serif), `branding.js` + `config/branding.json` (CTA lines; phone/instagram pending), `slides.js` + carousel endpoints (PUT slides, GET slide/:n, slides.zip).
- E2E verified: reel `b4b78d8e57a1` (hinglish/luxury, 54.5s, branded every scene + end card) and carousel `f2107fe173a2` (english/luxury, 8 slides 1080x1350, zip works).
- Added `scripts/preview-frames-branded.js`.

## 2026-07-31 (later) — Scene Types Expanded ✅

- Added `photo` (Wikimedia Commons archival photo, taped B&W print + Ken Burns), `chart` (animated line chart), `typewriter` scene types on top of headline/stat/card.
- Commons integration: search via `lib/images.js`, per-project asset serving, licenses in `attributions.json`. Search quirks fixed: AND-term over-specificity (retry dropping trailing words), relevance filter (title must prefix-match ≥2 query tokens else fall back to text), filters for diagrams/maps and >2.2:1 aspect.
- Re-rendered `aec133425240` end-to-end (13 scenes, 3 real photos), frames verified.
- Resolved render failure "Failed to launch the browser process!": stale server process held a bad Chrome; fix = restart server + retry. Diagnostics added: `scripts/test-browser.js`, `scripts/test-render.js`.

## 2026-07-31 — Backend Built, E2E Verified ✅ (initial build)

- Full pipeline implemented per `docs/api-contract.md`: script via spawned `claude -p` (no API key) → ElevenLabs TTS with word timestamps → scene planning via second `claude -p` (JSON spec, validated/auto-repaired) → Remotion render 1080x1920 h264 + thumbnail.
- Scene types: headline (kinetic word pop-ins synced to real word timings), stat, card; 4 color schemes.
- Test project `aec133425240` (shipping containers): 52.7s Short rendered, frames verified via `scripts/preview-frames.js`. Render ~1 min on RTX 4050.
- Express server on port 4000 (`npm start`), listens 0.0.0.0.

## ~2026-07-30 — Project Founded / Core Decisions

- Nerrico = automated Vox-style YouTube Shorts (45–50s) generator, US audience, English.
- **Zero-budget architecture**: local rendering (RTX 4050 PC), Claude Code CLI as the LLM (no API key), ElevenLabs free tier. No AWS/Vercel/paid APIs.
- **Division of work**: Claude → backend/pipeline; user → frontend via Antigravity IDE.
- Pipeline design decision: word timestamps drive scene durations in Remotion via a component library + JSON scene spec — NOT per-scene LLM codegen.
- Scriptwriting knowledge base distilled: `docs/scriptwriting-principles.md`.
