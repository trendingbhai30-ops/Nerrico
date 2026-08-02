# Nerrico

**Nerrico** is an AI-powered SaaS for turning research into professional short-form and long-form videos. Give it a topic or raw research, and it writes the script, generates the voiceover, plans the visuals shot-by-shot, and renders a finished vertical video — automatically, end to end.

Built around a timestamp-driven pipeline: AI-generated narration with word-level timing drives every scene, animation, and caption, so the visuals are always perfectly synced to the voice.

---

## Features

| Feature | Status | Description |
|---|---|---|
| **AI Research to Video** | ✅ Available | Turn a topic into a finished rendered video with one request |
| **AI Script Generation** | ✅ Available | Explainer-grade scripts written by Claude, tuned by a distilled scriptwriting knowledge base |
| **Scene Planning** | ✅ Available | AI plans every scene/shot as structured JSON — validated and auto-repaired before render |
| **Voice Generation** | ✅ Available | ElevenLabs TTS with word-level timestamps (English + Hinglish) |
| **Stock Media Integration** | ✅ Available | AI images (Pollinations), stock photos (Openverse), and archival photos (Wikimedia Commons) with automatic license attribution |
| **Project Management** | ✅ Available | Every video is a project with reviewable script, scenes, assets, and retry support |
| **Style Presets** | 🚧 Planned | Expanding beyond the current Vox / Luxury / Cinematic styles into a full style system ("Style Bible") |
| **Motion Graphics** | 🔨 In development | Nerrico Motion Engine (NME): style-agnostic registry of camera moves, transitions, and effects — foundation complete, implementations in progress ([architecture](docs/motion-engine.md)) |
| **Caption Engine** | 🚧 Planned | Advanced word-synced caption system with per-style typography |
| **User-provided AI APIs** | 🚧 Planned | Bring your own keys — Gemini, OpenAI, premium ElevenLabs, Pexels/Pixabay — for higher quality and throughput |

---

## Tech Stack

**Frontend**

- [React](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — build tooling and dev server
- [TypeScript](https://www.typescriptlang.org/) — strict, fully-typed API layer

**Backend**

- [Node.js](https://nodejs.org/) — runtime
- [Express](https://expressjs.com/) — REST API
- [Remotion](https://www.remotion.dev/) — programmatic video rendering (React-based compositions)

**AI Providers**

- **Claude CLI** — script writing and scene/shot planning
- **ElevenLabs** — text-to-speech with word timestamps
- **Pollinations** — AI image generation
- **Openverse** — free stock photography
- **Wikimedia Commons** — archival photography with license attribution
- *Future:* **Gemini**, **OpenAI** (via user-provided API keys)

---

## Project Structure

```
Nerrico/
├── frontend/   # React + Vite + TypeScript web app (project dashboard, script review, video preview)
├── backend/    # Express API + video pipeline
│   ├── src/        # layered source: config / utils / providers / content / core / api
│   ├── remotion/   # video compositions and style renderers (vox, luxury, cinematic)
│   │   └── motion/ # Nerrico Motion Engine (NME): camera, transitions, effects, presets
│   ├── config/     # branding assets and configuration
│   └── scripts/    # preview and diagnostic tools
├── assets/     # shared assets (voice samples, references)
└── docs/       # API contract, scriptwriting principles, and design docs
```

- **`frontend/`** — the user-facing app: create projects, review and approve scripts, monitor pipeline progress, and download finished videos.
- **`backend/`** — the engine: REST API, AI provider integrations, the script → voice → scenes → render pipeline, and per-project data storage.
- **`assets/`** — shared static assets used across the project.
- **`docs/`** — living documentation, including the frontend/backend API contract (`api-contract.md`).

---

## Development Workflow

Nerrico is developed in **explicit, sequential phases**. Each phase is scoped up front, built end-to-end, validated (builds, lint, API smoke tests, and a full real render), and documented before the next phase begins.

**Current status:**

> ✅ **Phase 1 — Foundation** complete: full SaaS-grade architecture refactor with a layered backend, typed frontend API layer, and centralized configuration.
>
> ✅ **Phase 2A — Motion Engine Foundation** complete: style-agnostic motion framework (registry, presets, timing engine, camera/transition/effect architecture).
>
> ✅ **Phase 2B — First Motion Implementations** complete: slow zoom, pan, fade, and film grain implemented through the engine and proven by a rendered validation demo.
>
> ✅ **Phase 2.5 — Motion Engine Integration** complete: the engine now powers the production styles (cinematic camera/grain/fade, vox Ken Burns), and the AI scene planner emits registry-validated motion presets, transitions, and effects. Remaining motion implementations follow in Phase 2C.

**Upcoming phases:**

| Phase | Focus |
|---|---|
| 2 | Motion Engine |
| 3 | Style Bible |
| 4 | Asset Engine |
| 5 | Voice Engine |
| 6 | Caption Engine |
| 7 | UI |
| 8 | Authentication & Firebase |
| 9 | YouTube Upload |
| 10 | Public Launch |

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for the detailed current state.

---

## Installation

**Prerequisites**

- [Node.js](https://nodejs.org/) 20+ (developed on v24)
- [Claude Code CLI](https://claude.com/claude-code) installed and authenticated (`claude` must be on your PATH)
- An ElevenLabs API key

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env   # then add your ELEVENLABS_API_KEY
npm start              # API on http://localhost:4000
```

> Always run the backend (and renders) from the `backend/` directory — Remotion caches its headless browser per working directory.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev            # Vite dev server (network-accessible via --host)
```

By default the frontend targets the local backend; override with `VITE_API_BASE_URL` in `frontend/.env` if needed.

---

## Documentation

| File | Purpose |
|---|---|
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | Live snapshot of the project: current phase, completed work, architecture, integrated providers, known technical debt, and what's next. Updated at the end of every phase. |
| [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) | How to build on Nerrico: folder structure, coding standards, architecture principles, the phase workflow, and rules future development sessions must follow. |
| [`CHANGELOG.md`](CHANGELOG.md) | Historical record of every completed phase and major architectural change. |

Additional design docs live in [`docs/`](docs/), including the backend API contract.

---

## Roadmap

- [x] Phase 1 — Foundation
- [ ] Phase 2 — Motion Engine
  - [x] Phase 2A — Motion Engine foundation (registry, types, presets, timing)
  - [x] Phase 2B — First motion implementations, PoC (slow zoom, pan, fade, film grain + MotionDemo)
  - [x] Phase 2.5 — Motion Engine integration (styles migrated onto NME, planner emits registry-validated motion)
  - [ ] Phase 2C — Remaining motion implementations
- [ ] Phase 3 — Style Bible
- [ ] Phase 4 — Asset Engine
- [ ] Phase 5 — Voice Engine
- [ ] Phase 6 — Caption Engine
- [ ] Phase 7 — UI
- [ ] Phase 8 — Authentication & Firebase
- [ ] Phase 9 — YouTube Upload
- [ ] Phase 10 — Public Launch

---

## Vision

Nerrico aims to become a **modular AI video creation platform**: a system where every part of the pipeline — research, scriptwriting, voice, imagery, motion, captions — is a swappable module, and where users can **bring their own AI providers** (Claude, Gemini, OpenAI, ElevenLabs, stock APIs) to control quality, cost, and style.

The goal is simple: anyone with an idea and a bit of research should be able to produce a video that looks professionally made — in minutes, not days.

---

## License

This repository is currently **private** and under **active development**. All rights reserved. No license is granted for use, distribution, or modification at this time.
