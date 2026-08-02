# DEVELOPMENT_GUIDE.md

> How Nerrico is built and how to keep building it. Read this + `PROJECT_STATUS.md` + `CHANGELOG.md` at the start of every AI session.

## Project Overview

**Nerrico** is an automated short-form video generator. It turns a topic into a finished 45–60s vertical video (or an Instagram carousel) with zero recurring cost:

- **Script**: written by a spawned `claude -p` process (Claude Code CLI — no Anthropic API key).
- **Voice**: ElevenLabs free tier, with word-level timestamps.
- **Visuals**: Remotion compositions driven by a JSON scene/shot spec; word timestamps drive scene durations. Three styles: `vox` (paper-cutout explainer), `luxury` (real-estate charcoal/cream/gold), `cinematic` (documentary reel with AI-generated images).
- **Render**: local, on the user's PC (RTX 4050, 16 GB RAM, Intel Core Ultra 210H). ~1 min per reel.

Two content modes: `normal` (Vox-style educational Shorts, English/US audience) and `realestate` ("Kastoori Real Estate" — Indian buyer/investor tips, branding applied visually, never pitched in the script). Languages: `english`, `hinglish`, `hindi` (hindi's default voice is free-tier-blocked; override via `HINDI_VOICE_ID`).

**People**: the user (Naitik) is 14 years old with zero budget — never propose paid services (AWS, paid APIs, Vercel). Claude builds the **backend/pipeline only**; the user builds the **frontend** themselves with the Antigravity IDE. Don't rewrite frontend features unless asked; API-type/config plumbing is fine.

## Folder Structure

```
Nerrico/
├── PROJECT_STATUS.md        ← current state (update every phase)
├── DEVELOPMENT_GUIDE.md     ← this file
├── CHANGELOG.md             ← phase history
├── docs/
│   ├── api-contract.md      ← backend API contract (source of truth for endpoints)
│   ├── motion-engine.md     ← Nerrico Motion Engine (NME) architecture reference
│   ├── scriptwriting-principles.md
│   └── antigravity-prompt.md
├── assets/                  ← voice samples etc.
├── backend/                 ← Node/Express + Remotion (plain JS)
│   ├── package.json         ← `npm start` runs src/server.js (port 4000)
│   ├── .env                 ← ELEVENLABS_API_KEY (restricted); GEMINI_API_KEY commented out
│   ├── .env.example
│   ├── config/              ← branding.json, kastoori-logo.png
│   ├── data/projects/<id>/  ← project.json + audio/images/video per project
│   ├── src/
│   │   ├── server.js        ← entry point
│   │   ├── config/          ← env.js (ONLY file reading process.env), constants.js
│   │   ├── utils/           ← logger.js, errors.js (HttpError), json.js, download.js
│   │   ├── providers/       ← claude.js, elevenlabs.js, images/ (registry), stock.js, commons.js
│   │   ├── content/         ← modes.js, styles.js, voices.js, prompts.js, branding.js
│   │   ├── core/            ← store.js, pipeline.js, scenes.js, slides.js, render.js
│   │   └── api/             ← app.js, middleware.js, routes/{meta,voices,projects}.js
│   ├── remotion/            ← compositions: Short.jsx, Slide.jsx, scenes.jsx,
│   │   ├── styles/          ←   vox.jsx, luxury.jsx, cinematic.jsx (+ index.js, theme.js)
│   │   └── motion/          ←   Nerrico Motion Engine (NME): registry, config, timing,
│   │                            camera/, transitions/, effects/, presets/, hooks.js
│   │                            (see docs/motion-engine.md)
│   └── scripts/             ← preview-frames.js, preview-frames-branded.js, test-slides.js,
│                              test-browser.js, test-render.js, test-motion.js (diagnostics)
└── frontend/                ← Vite + React + TypeScript (USER'S domain — Antigravity)
    └── src/                 ← config/constants.ts, utils/, full API types, zero `any`
```

## Coding Standards

- **Backend**: plain JavaScript (Node, ESM-style per existing files). No TypeScript in backend. Match existing file style.
- **Frontend**: TypeScript, strict — zero `any`. Full types for every API shape.
- **Env vars**: read `process.env` ONLY in `src/config/env.js`. Everything else imports from there.
- **Errors**: throw `HttpError` (src/utils/errors.js); the central middleware in `src/api/middleware.js` formats responses.
- **Logging**: use the scoped logger (`src/utils/logger.js`), respects `LOG_LEVEL`. No bare `console.log` in src/.
- **LLM JSON output**: never trust raw output — parse via `extractJson` (src/utils/json.js) and use `askClaudeJson` (providers/claude.js) which retries on invalid JSON. Scene specs are validated/auto-repaired in `core/scenes.js`.
- **New image providers**: one file per provider under `src/providers/images/`, registered in its `index.js`.
- **Prompts** live in `src/content/prompts.js`. When refactoring, keep prompts byte-identical unless the change is deliberately about prompt quality.
- **Motion (NME)**: new motions are one `motionRegistry.register()` call in the right category module (`remotion/motion/{camera,transitions,effects}/index.js`) + an `apply(t, motion)` function; presets are config-only in `presets/index.js`. Only `hooks.js` may import React/Remotion — everything else stays Node-testable. Run `node scripts/test-motion.js` after any `motion/` change. Full architecture: `docs/motion-engine.md`.
- **Frontend API base**: `VITE_API_BASE_URL`, but a localStorage override wins. Keep both working.

## Architecture Principles

1. **Zero budget is a hard constraint.** Free tiers and keyless services only. Local rendering. If a provider starts charging (like Gemini image gen did), fall back, don't ask for money.
2. **Deterministic pipeline, LLM at the edges.** Claude writes the script and plans scenes/shots as JSON; everything after that is deterministic code. NO per-scene LLM codegen.
3. **Timestamps are the backbone.** ElevenLabs word timestamps drive all scene/shot durations and word-synced animation. Any new style must consume the same timing data.
4. **Visual-first (cinematic style).** Never text-only shots. Fallback chain per shot: AI image (Pollinations; Gemini if quota ever returns) → stock photo (Pexels/Pixabay → Openverse → Commons) → icon/illustration scene → text as absolute last resort.
5. **Graceful degradation everywhere** — providers fail often (rate limits, 402s, empty search results). Every external call needs a fallback path.
6. **Projects are on-disk state.** `data/projects/<id>/project.json` is the source of truth; the server re-reads it on `/retry`, which makes manual edits a valid workaround.
7. **The API contract (`docs/api-contract.md`) is the frontend/backend boundary.** Update the doc AND the frontend types whenever routes change.
8. **Attribution matters.** Commons/stock images record licenses in the project's `attributions.json`.

## Phase Workflow

The project advances in explicit, user-approved phases:

1. User (or user + Claude) defines the phase scope. **Never start a phase the user hasn't approved.**
2. Build the complete E2E slice first, polish later — the user explicitly prefers "whole thing working roughly" over "one feature perfectly". Don't stop after small features; ask rather than assume.
3. Validate before declaring done: builds clean (frontend `tsc` + `vite build`), lint, server smoke test on all endpoints, and at least one full real render E2E.
4. On completion: update `PROJECT_STATUS.md` (current phase, debt, next phase) and add a `CHANGELOG.md` entry.
5. Stop and wait for user review before the next phase.

## Rules for Future Development

- **Restart the server after any `src/` change.** Stale server processes have repeatedly caused phantom bugs ("Unknown style", old-code behavior, hung Chrome breaking all renders). If renders fail mysteriously: kill server → restart → retry. Diagnostics: `scripts/test-browser.js`, `scripts/test-render.js`.
- **Run renders with cwd = `backend/`** or Remotion re-downloads 113 MB of chrome-headless-shell.
- **Windows + Remotion ffmpeg**: `%03d` output patterns fail; extract single frames with `-ss` in a loop.
- **Verify visual changes by looking at frames** (`scripts/preview-frames.js`, or `preview-frames-branded.js` for styles/branding — it passes style + branding like the real pipeline). Never declare a visual feature done from code alone.
- **ElevenLabs free tier**: only 3 premade voices work (George/Sarah/Adam — IDs in `src/content/voices.js`); library voices return 402. Hinglish currently uses Adam + `eleven_multilingual_v2`. Voice IDs are configurable, never hardcoded in compositions.
- **Skip SFX/background music** unless the user asks — explicitly deprioritized twice.
- **Kastoori business facts** (channel partner, Chandkheda & Zundal Ahmedabad, no brokerage) are context for the LLM only — NEVER pitched in scripts. Branding is visual (logo chip, wordmark, end-card CTA).
- **Don't touch `remotion/` casually** — compositions are frame-verified; changes there require re-verification.
- **Back up before big refactors** (tar.gz at repo root, like `nerrico-pre-phase1-backup.tgz`) — this is not a git repo (yet).

## How Future AI Sessions Should Continue This Project

1. **Read, in order**: `PROJECT_STATUS.md` → this file → latest `CHANGELOG.md` entries → `docs/api-contract.md` if touching the API.
2. **Confirm the current phase with the user** before writing code. If the user says "continue", the pending phase in PROJECT_STATUS.md is the scope.
3. **Respect the division of labor**: backend/pipeline = Claude; frontend = user (Antigravity). Frontend changes only for types/config plumbing or when explicitly asked.
4. **Work E2E-first** within the phase; validate with a real render; show frames for visual work.
5. **Before ending the session**: update `PROJECT_STATUS.md`, append to `CHANGELOG.md`, and note any new debt/quirks in the relevant section. These files are the project's long-term memory — if it isn't written here, the next session won't know it.
6. **When blocked on the user** (keys, approvals, taste decisions like voice/accent), record the open question in PROJECT_STATUS.md "Pending" and stop — don't guess on taste.
