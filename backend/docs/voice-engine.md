# Voice Engine

The Nerrico Voice Engine (NVE) is the centralized intelligence layer for all voice selection, resolution, and discovery in the pipeline. It follows the same registry → intelligence → integration pattern established by the Motion Engine, Style Bible, and Asset Engine.

## Overview

Every voice the pipeline may ever use is a validated, deep-frozen `VoiceRecord` in the voice registry — resolved by semantic id, never by a raw provider voiceId. The engine applies a deterministic policy chain to pick the right voice for any mode+language combination, and exposes clean integration seams for the pipeline, planner, and API routes.

```
src/voice/
  schema.js         VoiceRecord typedef, VOICE_PROVIDERS table, VOICE_TIERS, validateVoiceRecord
  registry.js       createVoiceRegistry() + voiceRegistry singleton
  definitions/
    index.js        side-effect imports of all provider definition files
    elevenlabs.js   4 built-in ElevenLabs voice records
  intelligence.js   LANGUAGE_DEFAULTS, MODE_VOICE_PREFERENCES, STYLE_VOICE_HINTS, selectVoice()
  resolver.js       resolveVoice(), resolveByProviderId(), SEMANTIC_VOICE_REFS
  search.js         searchVoices() — ranked multi-field search
  validate.js       validateVoiceRegistry() — post-import health check
  integration.js    seams: voiceForPipeline, voiceForLegacyId, voiceForMode, plannerVoiceSeam
  index.js          public API, listActiveVoices(), voiceOptions()
```

## Schema — VoiceRecord

Every registered voice is a validated, deep-frozen `VoiceRecord`:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Semantic id — must match `voice.<slug>`, e.g. `"voice.george"` |
| `displayName` | `string` | Human-readable name |
| `provider` | `string` | Key of `VOICE_PROVIDERS`, e.g. `"elevenlabs"` |
| `voiceId` | `string` | Provider-native voice identifier (e.g. ElevenLabs voice id) |
| `gender` | `'male'\|'female'\|'neutral'\|null` | |
| `accent` | `string` | e.g. `"british"`, `"us"`, `"hindi"` |
| `languages` | `string[]` | Language codes this voice handles well |
| `tags` | `string[]` | Semantic tags (`narrator`, `calm`, `energetic` …) |
| `tier` | `string` | Key of `VOICE_TIERS` |
| `supportsWordTimestamps` | `boolean` | Whether word-level timing is available |
| `supportsMultilingual` | `boolean` | Requires a multilingual TTS model |
| `supportsEmotion` | `boolean` | Expressive/style control available |
| `defaultSettings` | `object` | Provider-default generation params (stability, speed …) |
| `modelCompatibility` | `string[]` | Compatible model ids (provider-specific) |
| `status` | `'active'\|'inactive'\|'future'` | |
| `createdAt` / `updatedAt` | `string` | ISO timestamps |
| `metadata` | `object` | Provider-specific extras: `freeTierAvailable`, `requiresPaidPlan`, `freeNote`, `elevenLabsModel`, `bestFor` |

## Provider Table

`VOICE_PROVIDERS` in `schema.js` is the **only** place a provider is defined. Adding support for a new provider (OpenAI, Azure, Google, PlayHT, Cartesia, Kokoro, local TTS) = one entry in `VOICE_PROVIDERS` + one definition file in `definitions/`. No other files change.

Providers declared for BYOK readiness (not yet active): `openai`, `azure`, `google`, `playht`, `cartesia`, `kokoro`, `local`.

## Tier Table

`VOICE_TIERS` in `schema.js` defines the capability class of each voice:

| Tier | Description |
|---|---|
| `free-premade` | Built-in voices available on any free-tier API key |
| `library` | Shared voice library; requires a paid plan (ElevenLabs) |
| `cloned` | Professional Voice Clone; requires a paid plan |
| `premium` | Paid-only provider or model tier |
| `local` | Runs locally — no API key required |

## Registry

`createVoiceRegistry()` (factory) and `voiceRegistry` (production singleton) in `registry.js`. Mirrors Motion Registry / Style Bible / Asset Engine semantics exactly:

- Duplicate ids **throw** at registration (programmer/definition error).
- Unknown lookups return **null** (content input must never crash a render).
- Records are **deep-frozen** — every consumer shares the same reference safely.

Voices are registered as **side effects** when `definitions/index.js` is imported (same pattern as Style Bible styles). Importing `src/voice/index.js` triggers this automatically.

## Built-in Voices (ElevenLabs)

| Id | Name | Tier | Languages | Free tier |
|---|---|---|---|---|
| `voice.george` | George | `free-premade` | english | ✓ |
| `voice.sarah` | Sarah | `free-premade` | english | ✓ |
| `voice.adam` | Adam | `free-premade` | english, hinglish, multilingual | ✓ |
| `voice.viraj` | Viraj | `library` | hindi, hinglish | ✗ (402 on free key) |

`voice.viraj` is declared but gated: the pipeline (Phase 5B) checks `metadata.requiresPaidPlan` and falls back to `voice.adam` + `eleven_multilingual_v2` on the restricted key.

## Semantic Resolution

`SEMANTIC_VOICE_REFS` in `resolver.js` maps category aliases to canonical voice ids. The planner emits these refs, never raw provider voiceIds:

| Semantic ref | Resolves to |
|---|---|
| `voice.documentary`, `voice.narrator`, `voice.calm`, `voice.news` | `voice.george` |
| `voice.realestate`, `voice.finance`, `voice.corporate`, `voice.professional` | `voice.sarah` |
| `voice.tech`, `voice.energetic`, `voice.hinglish`, `voice.multilingual` | `voice.adam` |
| `voice.hindi` | `voice.viraj` |

`resolveVoice(ref)` resolution order:
1. Exact registry id (`"voice.george"` → record)
2. Semantic alias table (`"voice.documentary"` → `"voice.george"` → record)
3. Raw provider voiceId reverse-lookup (`"JBFqnCBsd6RMkjVDRZzb"` → george) — backwards compat
4. Free-text search fallback (limit 1)
5. `null`

## Intelligence — selectVoice()

The main policy function. Priority chain (first tier that resolves an active record wins):

```
user choice      → explicit voiceId or semantic ref at request time
  ↓
project default  → per-project stored voiceId from project.json (raw or semantic)
  ↓
mode + language  → MODE_VOICE_PREFERENCES[mode][language]
  ↓
language default → LANGUAGE_DEFAULTS[language]
  ↓
engine fallback  → "voice.george" (always resolves)
```

Return shape mirrors `selectMusic()`:
```js
{ policy, source, ref, voiceId, voice, trail }
```
`trail` is a debug log of which tiers were tried and why they fell through.

## Backwards Compatibility

Projects created before Phase 5A store a raw ElevenLabs voiceId in `project.json` (e.g. `"voiceId": "JBFqnCBsd6RMkjVDRZzb"`). The resolver handles this at step 3 above — `resolveByProviderId()` reverse-looks up the native id across all registered voices. Phase 5B wires this into the pipeline; Phase 5A prepares the interface only.

## Adding a New Voice

1. Add a `voiceRegistry.register({…})` block in `definitions/elevenlabs.js` (or a new `definitions/<provider>.js`).
2. If it's a new provider, add one entry to `VOICE_PROVIDERS` in `schema.js` and import the definition file in `definitions/index.js`.
3. Run `node scripts/test-voice-engine.js` to verify — the test checks all 4 current voices by id; update the count check if adding more.

## Adding a New Semantic Ref

Add one entry to `SEMANTIC_VOICE_REFS` in `resolver.js`. No other files need changing. The planner vocabulary auto-expands via `plannerVoiceVocabulary()`.

## Phase Roadmap

| Phase | Scope |
|---|---|
| **5A** ✅ | Foundation: registry, schema, definitions, intelligence, resolver, search, validate, integration seams |
| **5B** ✅ | Provider upgrade: `generateVoiceover()` accepts per-voice `modelId`+`voiceSettings`; `stepVoice()` in `pipeline.js` routes through `voiceForPipeline()` + free-tier gate; `voicePlan` persisted on project |
| **5C** ✅ | API surface: `GET /api/voices` → `voiceOptions()`; `GET /api/voices/defaults`; `GET /api/options` gains `voices` key; API contract v2.4 |
