import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');

// Only the voices verified to work on the restricted free-tier key.
export const VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', accent: 'US' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', accent: 'US' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', accent: 'British' },
  // Default Hindi narrator (user-provided ID, 2026-08-01). Override via HINDI_VOICE_ID in .env.
  { id: env.elevenlabs.hindiVoiceId || 'pHG3exaXQt8bmTWbaVOs', name: 'Viraj', gender: 'male', accent: 'Hindi' },
];

export function getVoice(id) {
  return VOICES.find((v) => v.id === id) || null;
}

export function samplePath(id) {
  const voice = getVoice(id);
  if (!voice) return null;
  return path.join(ASSETS, `voice-sample-${voice.name}.mp3`);
}
