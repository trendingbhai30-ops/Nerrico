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
 */
export async function generateVoiceover({ text, voiceId, outMp3 }) {
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
        model_id: TTS_MODEL_ID,
        voice_settings: TTS_VOICE_SETTINGS,
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
