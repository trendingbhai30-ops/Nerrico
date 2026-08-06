import fs from 'node:fs';
import { env } from '../config/env.js';
import {
  ELEVENLABS_API_URL,
  TTS_MODEL_ID,
  TTS_OUTPUT_FORMAT,
  TTS_VOICE_SETTINGS,
} from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('voice');

/**
 * Generate a voiceover with word-level timestamps.
 * Writes the mp3 to `outMp3` and returns { words: [{word,start,end}], durationSec }.
 *
 * Phase 5B: callers may pass per-voice `modelId` and `voiceSettings` resolved
 * from the Voice Engine registry. Falls back to the global constants so
 * pre-5B callers and tests remain unaffected.
 *
 * @param {{
 *   text: string,
 *   voiceId: string,
 *   outMp3: string,
 *   modelId?: string,
 *   voiceSettings?: object
 * }} opts
 */
export async function generateVoiceover({ text, voiceId, outMp3, modelId, voiceSettings }) {
  const model    = modelId       || TTS_MODEL_ID;
  const settings = voiceSettings || TTS_VOICE_SETTINGS;
  const res = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/with-timestamps?output_format=${TTS_OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.elevenlabs.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: settings,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  fs.writeFileSync(outMp3, Buffer.from(data.audio_base64, 'base64'));

  const words = wordsFromAlignment(data.alignment);
  if (!words.length) throw new Error('ElevenLabs returned no timing alignment');
  const durationSec = words[words.length - 1].end;
  log.info(`voiceover generated: ${words.length} words, ${durationSec.toFixed(1)}s`);
  return { words, durationSec };
}

function wordsFromAlignment(alignment) {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const words = [];
  let current = null;
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) {
      if (current) {
        words.push(current);
        current = null;
      }
      continue;
    }
    if (!current) {
      current = { word: chars[i], start: starts[i], end: ends[i] };
    } else {
      current.word += chars[i];
      current.end = ends[i];
    }
  }
  if (current) words.push(current);
  return words;
}
