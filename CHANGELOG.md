# CHANGELOG.md

All completed phases and major architectural changes, newest first. Add an entry every time a phase completes or the architecture shifts.

---

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
