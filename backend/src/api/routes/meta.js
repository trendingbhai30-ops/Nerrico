import { Router } from 'express';
import { MODES, LANGUAGES, FORMATS } from '../../content/modes.js';
import { STYLES } from '../../content/styles.js';
import { visualStyleOptions } from '../../content/stylebible/index.js';
import { logoPath } from '../../content/branding.js';

export const metaRouter = Router();

metaRouter.get('/health', (req, res) => res.json({ ok: true, version: '1.0' }));

metaRouter.get('/options', (req, res) => {
  res.json({
    modes: Object.values(MODES).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      researchOptional: m.researchOptional,
    })),
    languages: LANGUAGES,
    styles: Object.values(STYLES).map((s) => ({ id: s.id, name: s.name, description: s.description })),
    visualStyles: visualStyleOptions(),
    formats: FORMATS,
  });
});

metaRouter.get('/branding/logo', (req, res) => {
  const file = logoPath();
  if (!file) return res.status(404).json({ error: 'No logo configured' });
  res.type('image/png').sendFile(file);
});
