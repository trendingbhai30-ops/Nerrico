// Library asset serving — the HTTP half of the Asset Provider (Phase 4C).
//
// Renderers and clients address library assets ONLY through these routes
// (provider objects carry `/api/assets/<id>/file` URLs). Exact registered ids
// only — semantic resolution happens in the provider before a URL is ever
// built, so this surface can stay a dumb, safe file server. Filesystem
// locations never leave the process: metadata responses are publicAsset()
// (no localPath/hash), and the file route resolves the path internally.

import { Router } from 'express';
import fs from 'node:fs';
import { HttpError } from '../../utils/errors.js';
import { assetRegistry, assetAbsolutePath, publicAsset } from '../../assets/index.js';

export const assetsRouter = Router();

// Same alphabet the schema enforces for ids — anything else is a bad request,
// not a lookup.
const ID_SHAPE = /^[a-z0-9][a-z0-9.-]*$/;

// Streaming content types per registered extension (schema guarantees the
// extension is one of the category's supported ones).
const CONTENT_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.svg': 'image/svg+xml',
};

function requireAsset(req) {
  const id = req.params.id;
  if (!ID_SHAPE.test(id)) throw new HttpError(400, 'Bad asset id');
  const asset = assetRegistry.get(id); // exact ids only — no search surface here
  if (!asset) throw new HttpError(404, 'Unknown asset');
  return asset;
}

assetsRouter.get('/:id', (req, res) => {
  res.json(publicAsset(requireAsset(req)));
});

assetsRouter.get('/:id/file', (req, res) => {
  const asset = requireAsset(req);
  const file = assetAbsolutePath(asset);
  if (!fs.existsSync(file)) throw new HttpError(404, 'Asset file missing on disk');
  res.type(CONTENT_TYPES[asset.extension] || 'application/octet-stream');
  res.sendFile(file); // sendFile handles Range requests for audio seeking
});
