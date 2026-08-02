import { createLogger } from '../utils/logger.js';
import { HttpError } from '../utils/errors.js';

const log = createLogger('api');

/** Catch-all 404 for unknown routes. */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

/**
 * Central error handler — friendly JSON message, useful log, never a crash.
 * Express 5 forwards rejected async handlers here automatically.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Malformed JSON body from express.json().
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'The request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request body is too large' });
  }
  log.error(`${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
