import { Router } from 'express';
import fs from 'node:fs';
import { VOICES, samplePath } from '../../content/voices.js';

export const voicesRouter = Router();

voicesRouter.get('/', (req, res) => {
  res.json({
    voices: VOICES.map((v) => ({ ...v, sampleUrl: `/api/voices/${v.id}/sample` })),
  });
});

voicesRouter.get('/:id/sample', (req, res) => {
  const file = samplePath(req.params.id);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: 'Voice not found' });
  res.type('audio/mpeg').sendFile(file);
});
