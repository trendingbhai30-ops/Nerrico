# Nerrico Style Bible

> Phase 3 architecture doc. The Motion Engine's visual-intelligence counterpart: every look Nerrico can produce is a validated, frozen **definition** — structured data, zero prose templates — and the shot planner is composed from it.

## What it is

Before Phase 3, the cinematic shot planner's entire visual language (composition, lighting, palette, image-prompt wording) lived hardcoded inside one prompt string in `prompts.js`. One render style = one look. The Style Bible extracts that language into a registry of **visual style definitions**, so:

- One render style (the Remotion composition set, e.g. `cinematic`) can carry many **looks** (`documentary`, `history`, `finance`, …) with zero composition changes.
- The planner never invents visual language: `shotsPrompt` owns the scaffolding (word indices, JSON contract, coverage rules) and the definition owns every word of the look. Changing a look means changing a definition file, never planner code.
- Every AI image request is composed deterministically from the definition (the **consistency system**), so all shots of one video share the same medium, palette, and grade descriptors.

## Location & language

`backend/src/content/stylebible/` — plain Node ESM, no React, no Remotion:

- `registry.js` — `styleBible` (register / get / has / list / listActive). Mirrors the Motion Registry's semantics: duplicate names **throw** at registration (programmer error), unknown lookups return **null** (content input must never crash), definitions are **deep-frozen**.
- `schema.js` — `validateStyleDefinition(def)`, the single contract for a definition's shape, enforced at registration (import time).
- `styles/` — one file per definition, each ending in a `styleBible.register({...})` call; `styles/index.js` imports them all (side-effect registration, same pattern as `motion/presets`).
- `index.js` — the public API: `styleBible`, `getVisualStyle`, `resolveVisualStyle`, `defaultVisualStyle`, `visualStyleOptions`, `composeImagePrompt`, `validateStyleDefinition`. Importing it registers all built-ins.

## Anatomy of a definition

A definition is pure structured data (see any file in `styles/` — `history.js` is a good reference):

| Field | What it drives |
|---|---|
| `name` / `displayName` / `description` | Identity. `name` is the API id (kebab-case). |
| `status` | `'active'` (selectable) or `'future'` (declared, validated, **not** offered — `pixar-style`, `anime`). |
| `renderStyle` | The Remotion style this look runs on (`cinematic` / `vox` / `luxury`). Must exist in `STYLES`. |
| `philosophy` | The planner's STYLE PHILOSOPHY block — the look's worldview in prose. |
| `composition` / `framing` / `lighting` | Rule lists injected verbatim into the planner prompt. |
| `colorPalette` | `{description, tones[], accent}` — the LIGHT & COLOR block. |
| `cameraBehaviour` + `motion` | `motion = {pace, cameraPresets[], transitions[], effects[], transitionFrequency, effectFrequency}`. The planner is offered **only** these moves, with the style's own frequency guidance. |
| `typography` | `{captionStyle, rules[]}` — caption voice and rules. |
| `imagePrompt` | `{medium, prefix, suffix, vocabulary[], rules[]}` — how per-shot image prompts are written and wrapped. |
| `forbidden` | What may never appear in a generated image (text, logos, UI, …) — becomes the planner's NEVER list. |
| `consistency` | `{rules[], promptAnchors[]}` — cross-shot rules for the planner plus the anchor phrases appended to **every** image request. |

## Validation (schema.js)

Author mistakes throw at import time, long before a render — three layers:

1. **Shape**: every required field present with the right type (non-empty strings / arrays; `transitions`/`effects` may be empty arrays; `imagePrompt.suffix` may be an empty string).
2. **Cross-references**: `renderStyle` must be a registered render style; every motion preference must resolve — as a kind of that category **or** a preset of that category, the exact contract `validateShots` applies to planner output — to an **implemented** Motion Registry entry. A style can never steer the planner toward a static shot.
3. **Incompatible options**: no `forbidden` term may appear in the style's own prefix/suffix/vocabulary/anchors — a style that forbids what its own prompt machinery injects would violate itself on every shot.

## Resolution & defaults

`resolveVisualStyle(visualStyle, renderStyle)` is the only read path the pipeline uses: the project's own choice if it names an **active** definition, else the render style's default. Unknown, legacy (missing), and `'future'` values all degrade to the default — never a crash.

Defaults codify the pre-Phase-3 shipped looks, so existing behaviour is preserved when nothing is chosen: `cinematic → cinematic`, `vox → paper-collage`, `luxury → luxury`.

## The consistency system

`composeImagePrompt(style, shotPrompt)` is the **single enforcement point** for AI image requests (called only in `pipeline.js` `stepScenes`):

```
<imagePrompt.prefix>, <planner's per-shot description>, <…consistency.promptAnchors>, <imagePrompt.suffix>
```

Comma-joined phrase style (what image models parse best), trailing punctuation stripped per part, capped at 1200 chars (well under provider URL limits). `scenes.json` keeps the raw planner prompt; the composed prompt exists only per request. Because prefix + anchors + suffix are identical for every shot of a project, all sixteen images share medium, palette, and grade — one film, not sixteen images.

## Pipeline & API integration (Phase 3 wiring)

- **Store** (`core/store.js`): projects persist `visualStyle`; `getProject` backfills pre-Phase-3 projects with their render style's default.
- **Create** (`api/routes/projects.js` POST): optional `visualStyle`; unknown or `'future'` ids → 400. Omitted → `defaultVisualStyle(style)`. Project GET always reports it.
- **Options** (`api/routes/meta.js` GET `/api/options`): `visualStyles` — the 9 active looks as `{id, name, description, renderStyle}`; the frontend filters the picker by the selected render style. Contract: `docs/api-contract.md` (v2.1).
- **Planner** (`core/scenes.js` → `content/prompts.js`): `planScenes` resolves the project's look and passes it to `shotsPrompt`, which is composed entirely from the definition — including the motion vocabulary, narrowed from "everything implemented" to the style's `motion` preferences (planner output is still validated against the full Motion Registry in `validateShots`, so nothing new can break a render).
- **Frontend types** (`frontend/src/types/api.ts`): `VisualStyleId`, `VisualStyleOption`, `visualStyle` on `Project` / `CreateProjectPayload` / `OptionsResponse`. Pickers must populate from `/api/options`, not hardcode.

## Built-in styles

9 active: the three production defaults (`cinematic`, `paper-collage`, `luxury` — each codifying its render style's shipped look) plus the cinematic family — `documentary` (photojournalistic, natural light, archival honesty), `ai-documentary` (stylized surreal, symbolic hyperreal imagery), `history` (sepia archival, museum stillness), `finance` (institutional money look, glass towers, cold light), `modern-tech` (clean futurist, studio precision), `minimal` (radical reduction, vast negative space). 2 future (declared, validated, not offered): `pixar-style`, `anime`.

Adding a style = one new file in `styles/` + one import line in `styles/index.js`. Registration is validation; the planner, API, and pipeline pick it up with zero further changes.

## Testing

`node scripts/test-stylebible.js` (from `backend/`, pure Node) — 71 checks: registry semantics, schema acceptance/rejection (including cross-category motion refs and self-contradiction), every registered style's motion prefs re-checked as implemented against the live registry, resolution/default fallbacks, `/api/options` shape, `composeImagePrompt` layout, and a full `shotsPrompt` composition for each active style (no `undefined`, only the style's own presets offered).

Live API paths (options list, create-time 400s, legacy backfill) are covered by the standard server smoke ritual, not this script.
