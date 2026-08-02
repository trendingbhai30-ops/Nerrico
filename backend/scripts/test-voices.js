// Usage: node scripts/test-voices.js <voiceId> [voiceId...]
// Probes ElevenLabs voice ids against the (restricted) key with a short Hinglish
// sentence. Writes assets/voice-sample-<id>.mp3 for each id that works so you can
// listen before adding it to src/content/voices.js. Expect 402/404 on many premade voices.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateVoiceover } from '../src/providers/elevenlabs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', '..', 'assets');

const TEXT = 'Ghar kharidne se pehle yeh teen cheezein zaroor check karo. Sabse pehla, RERA registration. Trust me, yeh sabse important hai.';

const ids = process.argv.slice(2);
if (!ids.length) {
  console.log('Usage: node scripts/test-voices.js <voiceId> [voiceId...]');
  process.exit(1);
}

for (const voiceId of ids) {
  const outMp3 = path.join(ASSETS, `voice-sample-${voiceId}.mp3`);
  try {
    const { durationSec } = await generateVoiceover({ text: TEXT, voiceId, outMp3 });
    console.log(`PASS ${voiceId} — ${durationSec.toFixed(1)}s → ${outMp3}`);
  } catch (e) {
    console.log(`FAIL ${voiceId} — ${e.message}`);
  }
}
