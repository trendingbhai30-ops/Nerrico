# PROJECT_STATUS.md

> Snapshot of where Nerrico stands right now. Update this file at the end of every phase.
> Last updated: **2026-08-02** (after Phase 1 — SaaS foundation refactor)

## Current Phase

**Phase 1 (SaaS foundation) is COMPLETE and validated.** Waiting on user review before starting Phase 2.

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

## Pending Phases

- **Phase 2** — not yet defined; user will decide after reviewing Phase 1.
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
  - `content/` — `modes.js`, `styles.js`, `voices.js`, `prompts.js`, `branding.js`
  - `core/` — `store.js`, `pipeline.js`, `scenes.js`, `slides.js`, `render.js`
  - `api/` — `app.js`, `routes/{meta,voices,projects}.js`, `middleware.js`
- **Rendering**: `backend/remotion/` — `Short.jsx`, `Slide.jsx`, `scenes.jsx`, `styles/{vox,luxury,cinematic}.jsx`, `theme.js`. Untouched by Phase 1.
- **Project data**: `backend/data/projects/<id>/project.json` + assets. Server reads from disk on `/retry`, so editing project.json then retrying works.
- **Content matrix**: modes = normal | realestate; languages = english | hinglish; styles = vox | luxury | cinematic (cinematic is reels-only; carousels reuse luxury slides); formats = reel | carousel.
- **NOT a git repo.** No cloud services (zero budget).

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

- No git repo — only backup is `nerrico-pre-phase1-backup.tgz`. Should be initialized.
- No SFX/background music (intentionally skipped per user).
- Kastoori logo (`backend/config/kastoori-logo.png`) has a dark background, NOT transparent — may look like a dark box on light/cream slides; verify on first branded light render.
- Pollinations images occasionally contain garbled AI text in signage; actual resolution below 1080x1920 (upscales acceptably).
- Stale-server hazard: after editing `src/` files, the long-running server must be restarted — a stale process has twice caused "Unknown style" / old-code failures, and once a persistent Remotion "Failed to launch the browser process!" (fix: kill server, restart, retry). Diagnostic scripts: `backend/scripts/test-browser.js`, `test-render.js`.
- Remotion downloads chrome-headless-shell into `<cwd>/node_modules/.remotion` — always run renders with cwd = `backend/`, or it re-downloads 113 MB.
- On Windows, Remotion's ffmpeg wrapper fails with `%03d` output patterns — extract single frames with `-ss` in a loop instead.
- Voice-change workaround is manual: edit `data/projects/<id>/project.json` voiceId, then POST `/retry`.
- Leftover test artifacts in `backend/` root (`test-slide-*.png`, `refframes/`, `voxref/`) could be tidied.

## Next Planned Phase

**Phase 2 — scope TBD by user after Phase 1 review.** Likely drawn from the backlog above. Do not start it without user direction.
