# Nerrico Backend API Contract (v2)

Base URL: `http://localhost:4000`
All request/response bodies are JSON unless stated. The frontend must treat this contract as the source of truth — the backend is built to match it exactly.

**New in v2**: modes (normal / real-estate), languages (english / hinglish), visual styles (vox / luxury), and a carousel output format (static Instagram slides) alongside video reels.

**New in v2.1 (Phase 3 — Style Bible)**: `visualStyle` — a Style Bible look for the video, independent of the render `style`. Options come from `GET /api/options` → `visualStyles`; each option carries the `renderStyle` it belongs to, so the picker should show the visual styles matching the selected `style` (e.g. the 7 cinematic looks when `style=cinematic`). Optional everywhere: omitted or legacy projects default to the codified look of their render style (`cinematic` → `cinematic`, `vox` → `paper-collage`, `luxury` → `luxury`).

**New in v2.2 (Phase 4B — Asset Intelligence)**: `music` — an optional per-project music setting: `"auto"` (default — the selected visual style picks), `"none"` (silence), or a semantic music category from `GET /api/options` → `music.categories` (e.g. `"music.epic"`). The resolved decision appears on the project as `musicPlan` after scene planning. Note: nothing plays audio in renders yet — this is selection only; the plan becomes audible in a later phase.

## Health

`GET /api/health`
→ `200 {"ok": true, "version": "1.0"}`
Frontend shows a "backend offline" banner whenever this fails.

## Options (populate the New Project pickers from this — do not hardcode)

`GET /api/options`
→ `200`:
```json
{
  "modes": [
    {"id": "normal", "name": "Normal", "description": "...", "researchOptional": false},
    {"id": "realestate", "name": "Real Estate", "description": "...", "researchOptional": true}
  ],
  "languages": ["english", "hinglish"],
  "styles": [
    {"id": "vox", "name": "Vox Paper", "description": "..."},
    {"id": "luxury", "name": "Luxury Minimal", "description": "..."}
  ],
  "visualStyles": [
    {"id": "cinematic", "name": "Cinematic Documentary", "description": "...", "renderStyle": "cinematic"},
    {"id": "paper-collage", "name": "Paper Collage", "description": "...", "renderStyle": "vox"},
    {"id": "luxury", "name": "Luxury Minimal", "description": "...", "renderStyle": "luxury"},
    {"id": "documentary", "name": "Documentary Realism", "description": "...", "renderStyle": "cinematic"},
    {"id": "ai-documentary", "name": "AI Documentary", "description": "...", "renderStyle": "cinematic"},
    {"id": "history", "name": "History Archive", "description": "...", "renderStyle": "cinematic"},
    {"id": "finance", "name": "Finance Noir", "description": "...", "renderStyle": "cinematic"},
    {"id": "modern-tech", "name": "Modern Tech", "description": "...", "renderStyle": "cinematic"},
    {"id": "minimal", "name": "Minimal Gallery", "description": "...", "renderStyle": "cinematic"}
  ],
  "formats": ["reel", "carousel"],
  "music": {
    "policies": ["auto", "none"],
    "categories": ["music.ambient", "music.calm", "music.cinematic", "music.corporate", "music.documentary", "music.epic", "music.tech", "music.upbeat", "…"]
  }
}
```
When the selected mode has `researchOptional: true`, the research textarea may be left empty (a good title is enough). The voice picker is only shown/required when `format` is `reel`. `music.categories` is derived from the local music library's tags and grows automatically — populate a picker from it, never hardcode.

## Voices

`GET /api/voices`
→ `200 {"voices": [{"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "gender": "male", "accent": "US", "sampleUrl": "/api/voices/pNInz6obpgDQGcFmaJgB/sample"}]}`

`GET /api/voices/:id/sample` → `200` audio/mpeg (short mp3 preview)

## Projects (one project = one reel OR one carousel)

`POST /api/projects`
Body:
```json
{
  "title": "string (required)",
  "research": "string (raw pasted research; may be empty when the mode allows it)",
  "voiceId": "string (required for format=reel, omit for carousel)",
  "mode": "normal | realestate (default normal)",
  "language": "english | hinglish (default english)",
  "style": "vox | luxury (default vox)",
  "visualStyle": "a visualStyles id from /api/options (optional; defaults to the render style's own look; 400 on unknown ids)",
  "format": "reel | carousel (default reel)",
  "music": "auto | none | a music.categories id from /api/options (optional; default auto; 400 only on non-string/empty — unknown categories degrade to the style default)"
}
```
→ `201 {"id": "string"}`

`GET /api/projects`
→ `200 {"projects": [{"id", "title", "status", "createdAt", "thumbnailUrl": "/api/projects/:id/thumbnail | null"}]}`
(Carousel projects get a thumbnail too — it's slide 1.)

`GET /api/projects/:id`
→ `200`:
```json
{
  "id": "string",
  "title": "string",
  "status": "created | scripting | script_ready | voicing | planning_scenes | rendering | done | failed",
  "research": "string",
  "voiceId": "string | null",
  "mode": "normal | realestate",
  "language": "english | hinglish",
  "style": "vox | luxury",
  "visualStyle": "a visualStyles id (always present; legacy projects report their render style's default)",
  "format": "reel | carousel",
  "music": "auto | none | a semantic music category (always present; legacy projects report auto)",
  "musicPlan": "null until scene planning, then {\"policy\": \"auto | category | none | custom\", \"source\": \"user | project | style | engine\", \"ref\": \"string | null\", \"assetId\": \"string | null\"}",
  "script": "string | null (reels only)",
  "slides": "null | [{\"role\": \"hook | content | cta\", \"heading\": \"string\", \"body\": \"string\"}] (carousels only)",
  "error": "string | null",
  "progress": {"step": "string human-readable", "percent": 0},
  "videoUrl": "/api/projects/:id/video | null (reels, when done)",
  "slideUrls": "[\"/api/projects/:id/slide/1\", ...] | null (carousels, when done)",
  "zipUrl": "/api/projects/:id/slides.zip | null (carousels, when done)",
  "createdAt": "ISO date"
}
```

`DELETE /api/projects/:id` → `204`

## Pipeline actions

`POST /api/projects/:id/script/generate` → `202 {"ok": true}`
Status becomes `scripting`, then `script_ready`. For reels this fills `script`; for carousels it fills `slides` (there is no spoken script).

`PUT /api/projects/:id/script`
Body: `{"script": "string"}` → `200 {"ok": true}` (user edited the reel script; only while `script_ready`)

`PUT /api/projects/:id/slides`
Body: `{"slides": [{"role": "hook|content|cta", "heading": "string", "body": "string"}]}` → `200 {"ok": true}`
(User edited carousel slides; only while `script_ready`. 5–8 slides. `role` may be omitted — it is normalized server-side.)

`POST /api/projects/:id/approve` → `202 {"ok": true}`
Only valid from `script_ready`, else `409`.
- Reels: `voicing` → `planning_scenes` → `rendering` → `done`.
- Carousels: `rendering` → `done` (no voice/scene steps).

`POST /api/projects/:id/retry` → `202` (re-run from the failed step; only valid from `failed`)

## Files

`GET /api/projects/:id/video` → `200` video/mp4 (final 1080x1920 reel; supports range requests)
`GET /api/projects/:id/thumbnail` → `200` image/png
`GET /api/projects/:id/slide/:n` → `200` image/png (carousel slide n, 1-based, 1080x1350)
`GET /api/projects/:id/slides.zip` → `200` application/zip (all slides, for easy upload to Instagram)

## Branding

`GET /api/branding/logo` → `200` image/png (Kastoori Real Estate logo; 404 if not configured). Real-estate mode output is branded automatically by the backend — the frontend never needs to send branding.

## Status polling

No websockets. Frontend polls `GET /api/projects/:id` every 2 seconds while status is not `done`/`failed`/`script_ready`. (Unchanged from v1 — carousels reuse the same statuses.)

## Errors

Non-2xx responses: `{"error": "human readable message"}`
