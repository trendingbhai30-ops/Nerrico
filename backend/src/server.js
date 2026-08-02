import { env, validateEnv } from './config/env.js';
import { createLogger } from './utils/logger.js';
import { createApp } from './api/app.js';
import { ensureBundle } from './core/render.js';

const log = createLogger('server');

for (const warning of validateEnv()) log.warn(warning);

createApp().listen(env.port, '0.0.0.0', () => {
  log.info(`Nerrico backend running on http://localhost:${env.port}`);
  // Warm up the Remotion bundle in the background so the first render is fast.
  ensureBundle()
    .then(() => log.info('Remotion bundle ready'))
    .catch((e) => log.error('Remotion bundle failed (renders will retry):', e.message));
});
