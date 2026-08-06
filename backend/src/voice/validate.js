// Nerrico Voice Engine — validation (Phase 5A).
//
// Post-import health check for the voice registry. Returns a structured
// report rather than throwing — callers decide how fatal the issues are.
// Mirrors validateAssetLibrary() in src/assets/validate.js.

import { VOICE_PROVIDERS, VOICE_TIERS } from './schema.js';
import { voiceRegistry as defaultRegistry } from './registry.js';

/**
 * Validate the entire voice registry for consistency.
 *
 * @param {{ registry?: ReturnType<import('./registry.js').createVoiceRegistry> }} [opts]
 * @returns {{ ok: boolean, errors: string[], warnings: string[], info: string[] }}
 */
export function validateVoiceRegistry({ registry = defaultRegistry } = {}) {
  const errors   = [];
  const warnings = [];
  const info     = [];

  const all = registry.list({});

  if (all.length === 0) {
    warnings.push('Registry is empty — no voices registered');
    return { ok: true, errors, warnings, info };
  }

  // Duplicate provider-voiceId pairs (two records pointing to the same native id)
  const seenProviderIds = new Map(); // "provider:voiceId" → first registeredId
  for (const v of all) {
    const key = `${v.provider}:${v.voiceId}`;
    if (seenProviderIds.has(key)) {
      errors.push(
        `"${v.id}" shares provider voiceId "${v.voiceId}" with "${seenProviderIds.get(key)}"`
      );
    } else {
      seenProviderIds.set(key, v.id);
    }
  }

  // Every provider key resolves to a known VOICE_PROVIDERS entry
  for (const v of all) {
    if (!VOICE_PROVIDERS[v.provider]) {
      errors.push(`"${v.id}" references unknown provider "${v.provider}"`);
    }
  }

  // Every tier key resolves to a known VOICE_TIERS entry
  for (const v of all) {
    if (!VOICE_TIERS[v.tier]) {
      errors.push(`"${v.id}" references unknown tier "${v.tier}"`);
    }
  }

  // Every active voice has at least one language
  for (const v of all) {
    if (v.status === 'active' && !v.languages.length) {
      errors.push(`"${v.id}" is active but has no languages`);
    }
  }

  // Warn about voices with no tags (hard to discover via search)
  for (const v of all) {
    if (v.status === 'active' && !v.tags.length) {
      warnings.push(`"${v.id}" has no tags — discovery via search will be limited`);
    }
  }

  // Warn about library/cloned voices with no freeNote
  for (const v of all) {
    if (['library', 'cloned', 'premium'].includes(v.tier) && !v.metadata.freeNote) {
      warnings.push(`"${v.id}" is tier "${v.tier}" but metadata.freeNote is empty`);
    }
  }

  // Warn about voices with no modelCompatibility
  for (const v of all) {
    if (!v.modelCompatibility.length) {
      warnings.push(`"${v.id}" has an empty modelCompatibility array`);
    }
  }

  // Info summary
  const stats = registry.stats();
  for (const [provider, count] of Object.entries(stats)) {
    info.push(`${provider}: ${count} voice${count === 1 ? '' : 's'}`);
  }
  const active = all.filter((v) => v.status === 'active').length;
  const free   = all.filter((v) => !v.metadata.requiresPaidPlan && v.status === 'active').length;
  info.push(`${active} active voice${active === 1 ? '' : 's'}, ${free} free-tier available`);

  return { ok: errors.length === 0, errors, warnings, info };
}
