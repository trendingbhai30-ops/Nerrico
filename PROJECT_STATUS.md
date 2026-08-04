# PROJECT_STATUS.md

> Snapshot of where Nerrico stands right now. Update this file at the end of every phase.
> Last updated: **2026-08-04** (after Phase 3 — Style Bible)

## Current Phase

**Phase 3 (Style Bible) is COMPLETE and validated (NOT yet committed — working tree changes awaiting user approval).** The planner's visual language now lives in a registry of validated style definitions (`backend/src/content/stylebible/`, 9 active + 2 future looks), projects carry a `visualStyle`, the API exposes and validates it, and every AI image request is composed through the deterministic consistency system. Architecture doc: `docs/style-bible.md`. Next phase per the README roadmap: **Phase 4 — Asset Engine**. Do not start it without user approval.

## Completed Work

### Pre-phase (2026-07-31 → 2026-08-01) — working product built iteratively

- **Core pipeline (E2E verified)**: topic → script via spawned `claude -p` (no API key) → ElevenLabs TTS with word timestamps → scene planning via second `claude -p` (JSON spec, validated/auto-repaired) → Remotion render 1080x1920 h264 + thumbnail. ~45–60s Shorts, render ≈1 min on local RTX 4050.
- **Vox style**: headline (kinetic word pop-ins synced to word timings), stat, card, photo (Wikimedia Commons archival photos with Ken Burns), chart, typewriter scene types; 4 color schemes.
- **Real Estate mode** ("Kastoori Real Estate"): modes (normal/realestate), languages (english/hinglish), formats (reel/carousel), `luxury` style (charcoal/cream/gold serif), branding system (logo chip, wordmark, branded end card with CTA), carousel slide rendering (1080x1350, zip export). E2E verified with real projects.
- **Cinematic style** (major redirection, 2026-08-01): documentary-style reels — AI-generated images per shot (Pollinations.ai flux, keyless) with stock-photo → icon → text fallback chain, Ken Burns/parallax, grain/grade, sparse serif captions with red emphasis, progress bar. E2E verified (Blockbuster/Netflix test, real-estate Hinglish test).

### Phase 1 — SaaS foundation refactor (2026-08-02)

- Backend restructured from flat `lib/` into layered `src/` (see Architecture below). Behavior preserved; prompts byte-identical.
- `env.js` is now the ONLY place reading `process.env`; scoped logger with `LOG_LEVEL`; `HttpError` + central error middleware; image providers split one-file-per-provider behind a registry.
- Frontend: `VITE_API_BASE_URL` support (localStorage override still wins), `config/constants.ts`, `utils/{errors,format}.ts`, full API types, zero `any`.
- Validated: `tsc` + `vite build` clean, oxlint (1 pre-existing warning), server E2E smoke on all endpoints, full re-render of project `d2fe791fdb84` succeeded.
- Pre-refactor backup: `Nerrico/nerrico-pre-phase1-backup.tgz`. Old root `server.js` deleted.

### Phase 2A — Motion Engine foundation (2026-08-02)

- **Nerrico Motion Engine (NME)** built at `backend/remotion/motion/` — style-agnostic motion framework. Full architecture doc: `docs/motion-engine.md`.
- Central registry (camera/transition/effect/preset), JSDoc type contracts, config resolution chain (global defaults → preset → definition defaults → per-use overrides, resolved once per scene), timing engine (linear/easeIn/easeOut/easeInOut + `registerEasing` for future curves), Remotion hooks adapter (`hooks.js`, the only React-importing module).
- Declared (config-only, `status: 'planned'`): 6 camera kinds (zoom, pan, rotate, orbit, shake, focusPull), 6 transitions (fade, slide, whip, flash, paperReveal, morph), 6 effects (filmGrain, blur, glow, noise, particles, vignette), 6 presets (slowZoom, fastZoom, documentaryPan, cinematicDrift, newsPush, heroReveal). **No implementations yet by design** — dispatchers degrade to shared identity states so unimplemented motion can never break a render.
- Purely additive: zero changes to existing compositions, pipeline, or API. Smoke test: `backend/scripts/test-motion.js` (36 checks, all passing).
- Validated: motion test PASS, live server endpoints healthy, full standalone re-render RENDER OK, frontend `tsc`+`vite build` clean, oxlint 1 pre-existing warning only.

### Phase 2B — First motion implementations, proof of concept (2026-08-02)

- **Implemented 4 motions** by adding `apply` functions to their existing Phase 2A definitions (`status` flipped to `'implemented'`; zero architecture changes): camera **zoom** (scale/duration/easing + configurable `origin` focal point; math ported from `cinematic.jsx` `cameraTransform`), camera **pan** (left/right/up/down, constant hold-zoom, hand-held tilt), transition **fade** (in/out, duration/easing from the engine), effect **filmGrain** (single SVG turbulence rect — lightweight, deterministic seed derived from eased progress, `intensity: 0` skips the overlay entirely).
- **hooks.js additions**: `useCameraMotion` now returns `transformOrigin`; new `useEffectMotion` + `MotionEffect` overlay component (plain `React.createElement` — hooks.js stays the only React module in motion/). **Bug fixed**: hooks.js now side-effect-imports `presets/index.js` — without it, compositions importing only hooks.js got "Unknown preset" at render time.
- **MotionDemo**: new `remotion/MotionDemo.jsx` composition (4 plain labeled segments: slow zoom → pan → fade in/out → film grain over a procedural grid backdrop; zero hand-rolled animation math) + `scripts/render-motion-demo.js` (renders `data/motion-demo/motion-demo.mp4` + 8 verification stills). Rendered and frame-verified.
- Smoke test extended to **56 checks** (implementation math: zoom ramps/origin/intensity, pan directions, fade in/out, grain determinism; fallback checks moved to still-planned kinds). Production styles untouched.

### Phase 2.5 — Motion Engine integration (2026-08-02)

- **Registry validation** (`src/core/scenes.js`): `validateShots` now accepts planner-emitted `motion` (preset), `transition`, and `effect` fields, each checked against the Motion Registry — unregistered names are stripped to `null` (compositions fall back to the legacy `camera` move), so invalid planner output can never reach a render. Legacy `camera` is still validated/auto-assigned as before.
- **Cinematic migration** (`remotion/styles/cinematic.jsx`): hand-rolled `cameraTransform`/Grain/fade-in fully replaced by the engine. `LEGACY_CAMERA_SPECS` are exact NME ports of zoomIn/zoomOut/panLeft/panRight (old `Easing.inOut(Easing.quad)` registered as `quadInOut` so frames stay identical); designed-scene damping (`amp`) maps to NME `intensity`; grain via `MotionEffect` (`GRAIN_DARK`/`GRAIN_PAPER`); the 5-frame scene fade-in via `useTransitionMotion`. Planner-emitted presets are honored per shot (`buildCameraSpec`), with `amp` scaling the preset's own intensity on designed scenes.
- **Vox / Ken Burns migration** (`remotion/scenes.jsx`): PhotoScene's hand-rolled Ken Burns replaced by an exact NME port (`KEN_BURNS_SPEC`: linear zoom 1 → 1.07 across the scene).
- **Short.jsx `SceneMotion` wrapper**: every scene in every style is wrapped with planner-emitted entrance transition (0.4 s default) + full-frame effect overlay; scenes without motion fields resolve to the shared identity state — pre-2.5 projects render unchanged.
- **Scene planner emission** (`src/content/prompts.js`): `shotsPrompt` now emits `motion`/`transition`/`effect` alongside legacy `camera`. The offered vocabulary is sourced live from the registry (`cameraPresetLegend` + `implementedLegend`) and filtered to **implemented** kinds only — currently presets slowZoom/fastZoom/documentaryPan/newsPush, transition fade, effect filmGrain — so the prompt grows automatically as Phase 2C implements more kinds and the planner is never offered a preset that would degrade to a static shot.
- **Integration test** `scripts/test-motion-pipeline.js` (13 checks + rendered stills): planner output → `validateShots` → registry resolution → timing → real Remotion stills through the `Short` composition, for both a legacy fixture (camera-only, pre-2.5 shape) and a preset fixture. `--stills-only` mode captured a pre-migration baseline (`data/motion-pipeline/baseline/`).
- **Visual comparison**: post-migration `current/` stills vs `baseline/` — max per-channel pixel delta ≤ 7/255, uniform across the frame (grain-seed/AA noise only, no structural change). Preset-path stills show real camera travel between mid/late frame pairs. Migration preserved behaviour.
- **Validated**: motion smoke test 56/56, pipeline test 13/13, server restarted fresh + all endpoints healthy, full re-render of `d2fe791fdb84` (vox — exercises migrated Ken Burns) RENDER OK, frontend `tsc` + `vite build` clean, oxlint: no new warnings (5 findings all verified pre-existing via the pre-phase-1 backup).

### Phase 2C — Advanced Camera Motion Library (2026-08-02)

- **All camera kinds implemented** (7 total, all `status: 'implemented'`): Phase 2B's zoom/pan joined by **rotate** (slow roll around a pivot, corner-covering hold zoom), **orbit** (parametric-ellipse parallax drift anchored at (0,0) — full revolution returns home; unlocks the `cinematicDrift` preset), **push** (NEW kind — physical dolly via CSS-perspective math `scale = P/(P−z)`, hyperbolic acceleration unlike zoom's linear lerp, travel clamped so hostile params can't blow up the scale), **shake** (seeded sum-of-sines impact shake, incommensurate frequencies so it never visibly loops, `(1−t)^(3·decay)` envelope lands at exact rest, fully deterministic per seed), **focusPull** (rack-focus blur ramp + lens-breathing zoom; sub-0.05px blur snaps to 0 so the filter is dropped when sharp).
- **`useCameraMotion` now returns `filter`** (a `blur(px)` CSS string, '' for every other kind); cinematic's PhotoScene/NewspaperScene/FramedScene apply it, so planner-emitted focus pulls work in production.
- **5 new presets** (11 total; 10 camera presets in the planner vocabulary): slowRoll, pushIn, pullBack, impactShake, rackFocus — plus cinematicDrift now actually moves. Planner prompt picked them up automatically (Phase 2.5 registry-sourced vocabulary; zero prompt-code changes).
- **CameraDemo** (`remotion/CameraDemo.jsx` + `scripts/render-camera-demo.js`): 6 labeled segments (rotate, orbit, push in, pull out, focus pull, shake) over the MotionDemo grid backdrop; renders mp4 + 12 stills to `data/camera-demo/`. Rendered and frame-verified.
- **Validated**: motion smoke test 90/90 (was 56), pipeline test 13/13, baseline pixel-compare max delta 8/255 (grain/AA noise only), fresh server + endpoints healthy, full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint no new warnings.
- **FFmpeg finding**: frame extraction to `.bmp` fails ("encoder not found") because Remotion's bundled ffmpeg is a minimal build (`--disable-encoders` + allowlist: png/mjpeg/x264/…) with no bmp encoder, and no system ffmpeg exists. Local tooling constraint only — renders (libx264) and stills (png) are unaffected. Always extract frames as `.png`; for pixel comparisons use `pngjs` (already in backend node_modules).

### Phase 2D-1 — Motion Transitions (2026-08-03)

- **All 6 transitions implemented** (`status: 'implemented'`): Phase 2B's fade joined by **slide** (axis travel, fade completes at ~70% of the move so the settle reads as "arriving"; `withFade`/`distancePct` params), **whip** (full-frame lateral snap with horizontal-only SVG gaussian blur peaking mid-move via the 4p(1−p) parabola, dropped below 0.5px), **flash** (color wash over the fully-visible scene — rise to 30%, ^1.5 decay; overlay null at both endpoints), **paperReveal** (torn-edge clip-path sweep, deterministic sin-hash jags, completes to the SHARED identity), **morph** (simple entrance-only: scale 1.15 → 1 + blur 8px → 0 with snap-to-0 + front-loaded fade). All entrance-designed (scenes never overlap); the 'out' phase retraces the entrance.
- **`TransitionState` extended** (`types.js`, all new fields optional/benign on old states): `clipPath`, `overlay {color, opacity}`, `filterDef {id, x, y}`. New **`TransitionShell`** component in `motion/hooks.js` is the ONE place a full TransitionState maps to CSS (constant DOM shape across frames — no scene remounts); `Short.jsx`'s `SceneMotion` now wraps scenes with it instead of hand-applying fields.
- **heroReveal preset reachable**: the planner's `"transition"` field now accepts transition kinds OR transition-category presets — `transitionLegend()` in prompts.js offers them, `transitionOrNull()` in scenes.js validates them (camera/effect presets still rejected), `SceneMotion` resolves preset names as preset shorthand (preset keeps its own duration/easing).
- **TransitionDemo** (`remotion/TransitionDemo.jsx` + `scripts/render-transition-demo.js`): 6 labeled segments (slide, whip, flash, paperReveal, morph, heroReveal-as-preset) over the MotionDemo grid; mp4 + 18 stills to `data/transition-demo/`. Rendered and frame-verified (directional whip blur, torn paper edge, flash wash all visually confirmed).
- **Validated**: motion smoke test 124/124 (was 90), pipeline test 13/13, baseline pixel-compare max delta 8/255 (grain/AA noise only — legacy path untouched), fresh server + all endpoints healthy, full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning only.

### Phase 2D-2 — Motion Effects (2026-08-03)

- **All 6 effects implemented** (`status: 'implemented'`): Phase 2B's filmGrain joined by **blur** (backdrop-filter gaussian, focusPull-style focus semantics, ramp confined to a `settle` window so whole-scene specs don't stay soft, sub-0.1px drops the layer, `opacity` cross-blends), **glow** (Orton-style bloom — backdrop blurred + brightened over the sharp original, one layer, optional screen tint), **noise** (straight SVG turbulence through a linear contrast curve — analog static; deterministic stepping seed), **particles** (dust/embers/snow; sin-hash field cached frozen per (kind, count, seed), per-frame = pure trig of t, count clamped to 120, unknown kind → dust), **vignette** (single radial-gradient; spread/softness geometry, envelope-animated opacity).
- **Effect envelope**: for ramped effects, `direction` is the animation envelope ('in' ramps in — the global default, 'out' ramps out, 'hold' pins). Constant-strength effects (filmGrain/noise/particles) ignore it.
- **`MotionEffect` renderer** (`motion/hooks.js`): 5 new branches keyed on `state.kind` — hooks.js stays the only React module in motion/.
- **3 effect presets** (14 total): dust, embers, snow — particle moods with `easing: 'linear'` pinned (particles integrate eased progress as their clock). The `"effect"` field now accepts kinds OR effect-category presets, mirroring 2D-1's transition contract: `effectLegend()` (prompts.js), `effectOrNull()` (scenes.js), preset shorthand in `SceneMotion`.
- **EffectsDemo** (`remotion/EffectsDemo.jsx` + `scripts/render-effects-demo.js`): 7 labeled segments (blur, glow, noise, dust, embers, snow, vignette) → `data/effects-demo/` mp4 + 21 stills. Frame-verified (blurred backdrop under a sharp label, bloom halo, static, all three particle looks, edge darkening).
- **Validated**: motion smoke test 159/159 (was 124), pipeline test 17/17 (was 13; adds effect kind/preset pass-through + cross-category rejection), baseline pixel-compare max delta 8/255 (grain/AA noise — legacy path untouched), fresh server + all endpoints healthy, full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning only.

### Phase 3 — Style Bible (2026-08-04)

- **Style Bible** built at `backend/src/content/stylebible/` — the Motion Registry's visual counterpart: every look is a validated, deep-frozen structured definition (registry.js / schema.js / styles/ / index.js). Full architecture doc: `docs/style-bible.md`.
- **11 definitions**: 9 active (production defaults `cinematic`, `paper-collage` (vox), `luxury` — codifying the shipped looks so defaults preserve behaviour — plus cinematic-family `documentary`, `ai-documentary`, `history`, `finance`, `modern-tech`, `minimal`) + 2 `status: 'future'` (`pixar-style`, `anime` — declared/validated, not offered).
- **Schema enforcement at import time**: shape checks; cross-references (real renderStyle; every motion preference must resolve to an IMPLEMENTED Motion Registry kind/preset of the right category); incompatible-option detection (forbidden terms in the style's own prompt vocabulary throw).
- **Planner composed from data**: `shotsPrompt({ …, visual })` owns only the scaffolding — philosophy/composition/framing/lighting/palette/typography/forbidden/consistency all come from the definition, and the motion vocabulary offered is narrowed to the style's preferences (output still validated against the full registry).
- **Consistency system**: `composeImagePrompt` (called only in pipeline.js) wraps every AI image request as prefix → shot description → prompt anchors → suffix, comma-joined, 1200-char cap — all shots of one video share medium/palette/grade.
- **API + storage**: `visualStyle` persisted on projects (legacy projects backfilled with their render style's default on read), optional on POST /api/projects (400 on unknown/future ids), always present on project GET, and `GET /api/options` gained `visualStyles` (9 options with `renderStyle` for picker filtering). Contract v2.1 in `docs/api-contract.md`; frontend types extended (no UI work — pickers must populate from /api/options).
- **Smoke test**: `scripts/test-stylebible.js` — 71 pure-Node checks (registry, schema accept/reject, per-style implemented-motion re-verification, resolution fallbacks, options shape, prompt composition per active style).
- **Validated**: Style Bible smoke 71/71, motion smoke 159/159, pipeline test 17/17, baseline pixel-compare max delta 8/255, fresh server + all endpoints healthy (options, create-time 400s, explicit/default/legacy-backfill projects verified live), full re-render of `d2fe791fdb84` RENDER OK, frontend `tsc` + `vite build` clean, oxlint 1 pre-existing warning only.

## Pending Phases

- Roadmap after Phase 2 (user-defined, see README): 3 Style Bible, 4 Asset Engine, 5 Voice Engine, 6 Caption Engine, 7 UI, 8 Authentication & Firebase, 9 YouTube Upload, 10 Public Launch.
- Backlog candidates (user-acknowledged, not scheduled):
  - Background music + SFX (deprioritized twice by user; skip unless asked).
  - User accent-check of Adam speaking Hinglish (project `c54ed751b120`).
  - Free-tier-usable Hindi-sounding premade ElevenLabs voice.
  - Pexels/Pixabay free API keys for better stock photos.
  - Frontend ↔ backend integration testing by user.
  - YouTube upload step.
  - Kastoori `branding.json`: phone/instagram fields still EMPTY (waiting on user).

## Current Architecture

- **Monorepo layout**: `backend/` (Node/Express + Remotion, JS), `frontend/` (Vite + React + TS, built by user via Antigravity), `docs/`, `assets/`.
- **Backend entry**: `backend/src/server.js` (`npm start`), Express on port 4000, listens 0.0.0.0. API contract: `docs/api-contract.md`.
- **Layers** (`backend/src/`):
  - `config/` — `env.js` (sole reader of process.env), `constants.js`
  - `utils/` — logger (scopes + LOG_LEVEL), `errors.js` (HttpError), `json.js` (extractJson), `download.js`
  - `providers/` — `claude.js` (spawned `claude -p`, incl. `askClaudeJson` retry helper), `elevenlabs.js`, `images/` (one file per provider + `index.js` registry), `stock.js`, `commons.js`
  - `content/` — `modes.js`, `styles.js`, `voices.js`, `prompts.js`, `branding.js`, `stylebible/` (visual style registry + schema + definitions; see `docs/style-bible.md`)
  - `core/` — `store.js`, `pipeline.js`, `scenes.js`, `slides.js`, `render.js`
  - `api/` — `app.js`, `routes/{meta,voices,projects}.js`, `middleware.js`
- **Rendering**: `backend/remotion/` — `Short.jsx`, `Slide.jsx`, `scenes.jsx`, `styles/{vox,luxury,cinematic}.jsx`, `theme.js`. Untouched by Phase 1.
- **Motion Engine (NME)**: `backend/remotion/motion/` — registry, types, config, timing, camera/transitions/effects/presets, Remotion hooks. Architecture in `docs/motion-engine.md`. **The full Phase 2A vocabulary is implemented (as of 2D-2)**: ALL 7 camera kinds (zoom, pan, rotate, orbit, push, shake, focusPull), ALL 6 transitions (fade, slide, whip, flash, paperReveal, morph — rendered via `TransitionShell` in hooks.js), ALL 6 effects (filmGrain, blur, glow, noise, particles, vignette — rendered via `MotionEffect` branches in hooks.js), 14 presets. **Integrated (Phase 2.5)**: cinematic camera/grain/fade and vox Ken Burns run through the engine; `Short.jsx` applies planner-emitted transitions/effects to every style; the shot planner emits registry-validated `motion`/`transition`/`effect` fields (the transition field takes transition presets like heroReveal since 2D-1; the effect field takes effect presets dust/embers/snow since 2D-2). Integration test: `scripts/test-motion-pipeline.js` (+ visual baseline in `data/motion-pipeline/`). Demos: `scripts/render-camera-demo.js` → `data/camera-demo/`, `scripts/render-transition-demo.js` → `data/transition-demo/`, `scripts/render-effects-demo.js` → `data/effects-demo/`.
- **Project data**: `backend/data/projects/<id>/project.json` + assets. Server reads from disk on `/retry`, so editing project.json then retrying works.
- **Content matrix**: modes = normal | realestate; languages = english | hinglish | hindi (hindi writes Devanagari and defaults to library voice "Viraj" — blocked on free tier, override via `HINDI_VOICE_ID`); styles = vox | luxury | cinematic (cinematic is reels-only; carousels reuse luxury slides); formats = reel | carousel; **visualStyle** (Phase 3) = a Style Bible look per project — 9 selectable via `GET /api/options` → `visualStyles`, defaulting to the render style's codified look (cinematic → cinematic, vox → paper-collage, luxury → luxury). Smoke test: `scripts/test-stylebible.js` (71 checks).
- **Git repo initialized** (local only, one commit per phase since Phase 1). No cloud services (zero budget).

## APIs / Providers Integrated

| Provider | Status | Notes |
|---|---|---|
| Claude Code CLI (`claude -p`) | Working | Scriptwriting + scene/shot planning; no API key needed |
| ElevenLabs (free tier) | Working | TTS with word timestamps. Restricted key in `backend/.env`. Only 3 premade voices work: George `JBFqnCBsd6RMkjVDRZzb`, Sarah `EXAVITQu4vr4xnSDxMaL`, Adam `pNInz6obpgDQGcFmaJgB`. Library voices (e.g. Hindi "Viraj" `pHG3exaXQt8bmTWbaVOs`) blocked on free tier (402). Hinglish uses Adam via `eleven_multilingual_v2` fallback |
| Pollinations.ai | Working | Keyless free AI image gen (flux), deterministic seed per shot. ~576x1024 actual res, ~20–60s/image (16 shots ≈ 8–10 min). Primary cinematic image source |
| Gemini image gen | Blocked | User's key is valid but Google free tier now has 0 quota/day for ALL image models — useless without billing. Key commented out in `backend/.env` |
| Openverse | Working | Keyless stock-photo fallback |
| Wikimedia Commons | Working | Archival photos; search quirks handled (AND-terms retry, prefix-match relevance filter, aspect/diagram filters). Licenses recorded in `attributions.json` |
| Pexels / Pixabay | Not integrated | Free keys not yet provided by user |

## Known Technical Debt

- Git repo is local-only (no remote) — `nerrico-pre-phase1-backup.tgz` is the only other backup.
- Remotion's bundled ffmpeg (the only ffmpeg on this machine) has NO `bmp` encoder (minimal `--disable-encoders` build; png/mjpeg/x264 only) and no `rawvideo` muxer — extract frames as `.png` only; for pixel comparisons use `pngjs` from backend node_modules.
- No SFX/background music (intentionally skipped per user).
- Kastoori logo (`backend/config/kastoori-logo.png`) has a dark background, NOT transparent — may look like a dark box on light/cream slides; verify on first branded light render.
- Pollinations images occasionally contain garbled AI text in signage; actual resolution below 1080x1920 (upscales acceptably).
- Stale-server hazard: after editing `src/` files, the long-running server must be restarted — a stale process has twice caused "Unknown style" / old-code failures, and once a persistent Remotion "Failed to launch the browser process!" (fix: kill server, restart, retry). Diagnostic scripts: `backend/scripts/test-browser.js`, `test-render.js`.
- Remotion downloads chrome-headless-shell into `<cwd>/node_modules/.remotion` — always run renders with cwd = `backend/`, or it re-downloads 113 MB.
- On Windows, Remotion's ffmpeg wrapper fails with `%03d` output patterns — extract single frames with `-ss` in a loop instead.
- Voice-change workaround is manual: edit `data/projects/<id>/project.json` voiceId, then POST `/retry`.
- Leftover test artifacts in `backend/` root (`test-slide-*.png`, `refframes/`, `voxref/`) could be tidied.

## Next Planned Phase

**Phase 4 — Asset Engine** (per the user's README roadmap). Phase 3 (Style Bible) is complete and validated but NOT yet committed — the working tree holds the Phase 3 changes; commit needs user approval. Note: the long-running backend server caches its Remotion bundle per process — restart it after `src/` or `motion/` changes (freshly restarted during Phase 3 validation). Do not start Phase 4 without user approval. Frontend follow-up owned by the user: a `visualStyle` picker populated from `/api/options` → `visualStyles`, filtered by the selected render style.
