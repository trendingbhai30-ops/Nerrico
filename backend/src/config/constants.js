// Centralized constants — no magic numbers scattered through the codebase.

// ---------------------------------------------------------------- HTTP / API
export const JSON_BODY_LIMIT = '5mb';
export const USER_AGENT = 'NerricoShorts/1.0 (personal hobby project)';

// ---------------------------------------------------------------- LLM (Claude CLI)
export const CLAUDE_TIMEOUT_MS = 6 * 60 * 1000;
// Planner replies get one retry with the validation error appended.
export const PLAN_ATTEMPTS = 2;

// ---------------------------------------------------------------- Voice (ElevenLabs)
export const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
export const TTS_MODEL_ID = 'eleven_multilingual_v2';
export const TTS_OUTPUT_FORMAT = 'mp3_44100_128';
export const TTS_VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75, speed: 1.05 };

// ---------------------------------------------------------------- Video / images
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
// Downloads smaller than this are treated as error pages / placeholders.
export const MIN_IMAGE_BYTES = 10_000;
export const MIN_AI_IMAGE_BYTES = 20_000;
export const IMAGE_GEN_ATTEMPTS = 2;
export const IMAGE_GEN_RETRY_DELAY_MS = 5_000;
export const POLLINATIONS_TIMEOUT_MS = 120_000; // generation can take a minute

// Stock photos: reject extreme panoramas/strips — they crop terribly into 9:16.
export const MAX_STOCK_ASPECT_RATIO = 2.2;

// ---------------------------------------------------------------- Slides (carousel)
export const MAX_SLIDES = 8;
export const MIN_SLIDES = 3;
export const SLIDE_HEADING_MAX = 80;
export const SLIDE_BODY_MAX = 260;

// ---------------------------------------------------------------- Files
export const ARTIFACTS = {
  voiceover: 'voiceover.mp3',
  timing: 'timing.json',
  scenes: 'scenes.json',
  attributions: 'attributions.json',
  video: 'video.mp4',
  thumbnail: 'thumbnail.png',
  slidesZip: 'slides.zip',
  slide: (n) => `slide-${n}.png`, // 1-based
  shotPng: (i) => `shot-${i}.png`,
  shotJpg: (i) => `shot-${i}.jpg`,
  photo: (i) => `photo-${i}.jpg`,
};
