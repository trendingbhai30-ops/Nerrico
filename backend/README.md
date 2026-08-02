# Nerrico Backend

Automated Vox-style YouTube Shorts pipeline. Implements `docs/api-contract.md` exactly.

## Run

```
cd backend
cp .env.example .env   # first time only — then fill in your keys
npm start
```

Server: `http://localhost:4000` (listens on 0.0.0.0, so your phone on the same WiFi can reach it too).

## Architecture

```
src/
  config/      env.js (all environment access) + constants.js (no magic numbers)
  utils/       logger, error helpers, JSON extraction, downloads
  providers/   every external service, isolated & swappable:
               claude.js (LLM via claude CLI), elevenlabs.js (TTS),
               images/ (AI image chain: cloudflare/gemini/openai/flux/stability/pollinations),
               stock.js (Pexels/Pixabay/Openverse/Commons), commons.js
  content/     modes, styles, voices, prompts, branding — what the videos say & look like
  core/        store (projects on disk), pipeline (step orchestration),
               scenes/slides (plan + validate), render (Remotion)
  api/         express app, routes/, error-handling middleware
  server.js    entry point
remotion/      Remotion compositions (Short, Slide) + per-style components
scripts/       standalone diagnostics (see Debugging)
```

The frontend never talks to providers directly — everything goes through the API,
and the pipeline talks to providers only through `src/providers/`. Adding a new
image provider = one file in `src/providers/images/` + one registry line.

## How the pipeline works

1. **Script** — spawns `claude -p` (your Claude Code login, no API key) with the rules from `docs/scriptwriting-principles.md` baked into `src/content/prompts.js`.
2. **Voiceover** — ElevenLabs `with-timestamps` endpoint (`src/providers/elevenlabs.js`) → `voiceover.mp3` + word-level timings (`timing.json`).
3. **Scenes** — a second `claude -p` call plans a JSON scene spec (`src/core/scenes.js`); validated and auto-repaired so word coverage is always contiguous. Cinematic style also generates/fetches an image per shot (AI → stock → icon fallback).
4. **Render** — Remotion (`remotion/`) renders 1080x1920 h264 + a thumbnail (`src/core/render.js`). Word pop-ins are driven by the real voiceover timings.

Everything for a project lives in `backend/data/projects/<id>/`.

## Configuration

- All keys and tunables live in `.env` (see `.env.example` for every option — image provider chain, log level, port, stock photo keys).
- `LOG_LEVEL=debug` shows timing info for renders and bundles.

## Scene types

- `headline` — kinetic typography, words pop in as spoken, yellow highlight on emphasized words
- `stat` — one big number with a label
- `card` — paper cutout card, used for quotes/payoff lines
- `photo` — real archival photo (Wikimedia Commons) with Ken Burns
- `chart` — animated line chart · `typewriter` — letter-by-letter reveal
- `shot` — cinematic style: full-screen AI/stock image + camera move + serif caption

Color schemes in `remotion/theme.js` (cream / black / yellow / red).

## Debugging

- `node scripts/preview-frames.js <projectId> <frame> [frame...]` renders still frames from a finished project so you can inspect visuals without re-rendering the video.
- `node scripts/test-render.js` re-renders a known project standalone (server must be running for asset URLs).
- `node scripts/test-browser.js` checks the Remotion headless browser launches.
- First render after startup is slower (Remotion bundles + may download its headless browser).
- The ElevenLabs key in `.env` is a restricted free-tier key; only the 3 US/UK voices in `src/content/voices.js` work on it.
