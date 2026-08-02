# Antigravity Prompt — Nerrico Frontend

Paste everything below the line into Antigravity. Also make sure the file
`C:\Users\Naitik Sharma\Nerrico\docs\api-contract.md` is available to it (open the
Nerrico folder as the workspace so it can read the contract itself).

---

Build a complete frontend web app called **Nerrico** — a control panel for an automated YouTube Shorts video generator. The backend already has a fixed API contract (see `docs/api-contract.md` in this workspace — follow it EXACTLY, do not invent or rename endpoints). The backend runs at `http://localhost:4000`; make this base URL a single constant in one config file.

## Tech stack
- Vite + React + TypeScript + Tailwind CSS
- No backend code, no database, no auth — this is a pure frontend that talks to the existing API
- Put the app in the `frontend/` folder of this workspace

## Design
- Dark theme, modern, clean. Accent color: electric yellow (#FFD60A) on near-black (#0E0E10), white text. Vox-documentary vibe: bold condensed headings (use a Google Font like "Archivo Black" or "Oswald"), generous spacing.
- Fully responsive — must look great on a phone (this will be used from mobile via local network).
- The app name "NERRICO" appears as a bold wordmark top-left.

## Pages / views

### 1. Dashboard (home)
- Grid/list of all projects from `GET /api/projects`: title, status badge (color-coded per status), created date, thumbnail if available.
- Big primary button "+ New Video".
- Each card links to its Project page. Delete button per card (with confirm dialog) → `DELETE /api/projects/:id`.

### 2. New Video
- Form: title input, large textarea "Paste your research here" (autosize, monospace), voice picker.
- Voice picker: fetch `GET /api/voices`, show as cards with name/accent/gender and a play button that plays `sampleUrl` audio inline.
- Submit → `POST /api/projects` then immediately `POST /api/projects/:id/script/generate`, then navigate to the Project page.

### 3. Project page (the heart of the app)
Shows a vertical pipeline stepper: **Script → Voiceover → Scene Planning → Rendering → Done**, driven by the `status` field:
- `scripting`: spinner on step 1, "Writing your script…"
- `script_ready`: show the script in a large editable textarea + word count + estimated duration (words ÷ 2.6 per second, rounded). Two buttons: "Save edits" (`PUT .../script`) and a big "Approve & Generate Video" (`POST .../approve`).
- `voicing` / `planning_scenes` / `rendering`: animated progress using `progress.percent` and `progress.step` text.
- `done`: embedded vertical 9:16 video player (max height ~70vh) playing `videoUrl`, plus a prominent "Download" button.
- `failed`: show `error` in a red panel with a "Retry" button (`POST .../retry`).
- Poll `GET /api/projects/:id` every 2 seconds while status is transitional (not `done`/`failed`/`script_ready`).

### 4. Settings (simple)
- Backend URL field (persisted to localStorage, defaults to http://localhost:4000)
- Backend status indicator using `GET /api/health` (green dot = online, red = offline)

## Global behaviors
- If `GET /api/health` fails, show a persistent top banner: "Backend offline — start the Nerrico backend first."
- All errors from the API (`{"error": "..."}`) surface as toast notifications.
- Loading skeletons, not blank screens.
- PWA: add a manifest + icons so the site can be installed via "Add to Home Screen" on mobile.

## Do NOT
- Do not mock endpoints with different shapes than the contract.
- Do not add login/signup.
- Do not use Next.js or any server-side rendering — plain Vite SPA only.

When done, provide the commands to install and run the dev server, and make `npm run dev` serve on `0.0.0.0` so it's reachable from a phone on the same WiFi.
