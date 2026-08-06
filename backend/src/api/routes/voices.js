// Voice API routes (Phase 5C).
//
// GET /api/voices          — structured voice list from the Voice Engine registry.
// GET /api/voices/defaults — the engine's default voice for a mode + language.
// GET /api/voices/:id/sample — audio/mpeg preview (accepts both semantic ids and
//                              raw ElevenLabs voiceIds for backwards compat).

import { Router } from 'express';
import fs from 'node:fs';
import { voiceOptions, voiceForMode, resolveVoice } from '../../voice/index.js';
import { samplePath } from '../../content/voices.js';

export const voicesRouter = Router();

// GET /api/voices
// Returns the Voice Engine's structured voice list — richer than the old flat array.
// Shape: { voices: [...], providers: [...], tiers: [...] }
voicesRouter.get('/', (req, res) => {
  res.json(voiceOptions());
});

// GET /api/voices/defaults?mode=normal&language=english
// The engine's default voice for a given mode + language combination.
// Useful for pre-selecting the voice picker on the New Project form.
voicesRouter.get('/defaults', (req, res) => {
  const mode     = String(req.query.mode     || 'normal');
  const language = String(req.query.language || 'english');
  const voice    = voiceForMode(mode, language);
  if (!voice) return res.json({ voice: null });
  res.json({
    voice: {
      id:               voice.id,
      displayName:      voice.displayName,
      voiceId:          voice.voiceId,
      accent:           voice.accent,
      tier:             voice.tier,
      freeTierAvailable: voice.metadata.freeTierAvailable === true,
    },
  });
});

// GET /api/voices/:id/sample
// Short mp3 preview. Accepts both semantic ids ("voice.george") and raw
// ElevenLabs voiceIds ("JBFqnCBsd6RMkjVDRZzb") for backwards compat.
voicesRouter.get('/:id/sample', (req, res) => {
  const reqId = req.params.id;

  // Resolve semantic id → raw ElevenLabs voiceId.
  let rawId = reqId;
  if (reqId.startsWith('voice.')) {
    const record = resolveVoice(reqId);
    rawId = record ? record.voiceId : reqId;
  }

  const file = samplePath(rawId);
  if (!file || !fs.existsSync(file)) {
    return res.status(404).json({ error: 'Voice sample not found' });
  }
  res.type('audio/mpeg').sendFile(file);
});
