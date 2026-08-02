import { env } from '../config/env.js';

// Centralized logging. Every subsystem gets a scoped logger:
//   const log = createLogger('pipeline');
//   log.info('rendering started', { id });
// Levels: debug < info < warn < error, filtered by LOG_LEVEL in .env.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[env.logLevel] ?? LEVELS.info;

function write(level, scope, args) {
  if (LEVELS[level] < threshold) return;
  const time = new Date().toISOString().slice(11, 19);
  const line = `[${time}] [${level.padEnd(5)}] [${scope}]`;
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line, ...args);
}

export function createLogger(scope) {
  return {
    debug: (...args) => write('debug', scope, args),
    info: (...args) => write('info', scope, args),
    warn: (...args) => write('warn', scope, args),
    error: (...args) => write('error', scope, args),
    /** Time an async operation and log its duration at debug level. */
    async time(label, fn) {
      const start = Date.now();
      try {
        return await fn();
      } finally {
        write('debug', scope, [`${label} took ${((Date.now() - start) / 1000).toFixed(1)}s`]);
      }
    },
  };
}
