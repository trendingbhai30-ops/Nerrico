// Centralized frontend constants — no magic numbers in components.

/** How often the app pings GET /api/health. */
export const HEALTH_POLL_INTERVAL_MS = 10_000;

/** How often an in-progress project page refetches its status. */
export const PROJECT_POLL_INTERVAL_MS = 2_000;

/** Toast auto-dismiss delay. */
export const TOAST_DURATION_MS = 5_000;

/** Average spoken words per second, used to estimate script duration. */
export const WORDS_PER_SECOND = 2.6;
