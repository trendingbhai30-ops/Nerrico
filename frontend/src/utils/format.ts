import { WORDS_PER_SECOND } from '../config/constants';

/** "Aug 2, 2026, 12:30 PM" — falls back to the raw string on bad input. */
export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export interface ScriptStats {
  words: number;
  estDuration: number;
}

/** Word count and estimated spoken duration (seconds) for a script. */
export function calculateScriptStats(text: string): ScriptStats {
  const trimmed = text.trim();
  if (!trimmed) return { words: 0, estDuration: 0 };
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return { words, estDuration: Math.round(words / WORDS_PER_SECOND) };
}
