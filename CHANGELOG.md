# CHANGELOG.md

All completed phases and major architectural changes, newest first. Add an entry every time a phase completes or the architecture shifts.

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
