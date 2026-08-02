import { askClaudeJson } from '../providers/claude.js';
import { carouselPrompt } from '../content/prompts.js';
import { getMode } from '../content/modes.js';
import { MAX_SLIDES, MIN_SLIDES, SLIDE_HEADING_MAX, SLIDE_BODY_MAX } from '../config/constants.js';

const ROLES = new Set(['hook', 'content', 'cta']);

/**
 * Ask Claude to design carousel slides, then validate/repair the result.
 * Retries once with the validation error appended to the prompt.
 */
export function planSlides({ title, research, mode, language }) {
  const prompt = carouselPrompt({ title, research, mode, language });
  const branded = Boolean(getMode(mode)?.branded);
  return askClaudeJson(prompt, (data) => validateSlides(data, { branded }), { label: 'Carousel planning' });
}

/** Normalizes slides into a fixed shape; also used to validate user edits (PUT /slides). */
export function validateSlides(data, { branded = false } = {}) {
  if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
    throw new Error('missing non-empty "slides" array');
  }
  const slides = data.slides.slice(0, MAX_SLIDES).map((s) => ({
    role: ROLES.has(s.role) ? s.role : 'content',
    // Strip manual "1." / "2)" numbering — both visual styles number slides themselves.
    heading: s.heading ? String(s.heading).slice(0, SLIDE_HEADING_MAX).trim().replace(/^\d+\s*[.)\-:]\s*/, '') : '',
    body: s.body ? String(s.body).slice(0, SLIDE_BODY_MAX).trim() : '',
  }));
  if (slides.length < MIN_SLIDES) throw new Error(`need at least ${MIN_SLIDES} slides`);

  // Exactly one hook (first) and, when branded, exactly one cta (last).
  slides[0].role = 'hook';
  for (let i = 1; i < slides.length; i++) {
    if (slides[i].role === 'hook') slides[i].role = 'content';
  }
  if (branded) {
    for (let i = 0; i < slides.length - 1; i++) {
      if (slides[i].role === 'cta') slides[i].role = 'content';
    }
    slides[slides.length - 1].role = 'cta';
  } else {
    for (const s of slides) {
      if (s.role === 'cta') s.role = 'content';
    }
  }

  for (const s of slides) {
    if (!s.heading && s.role !== 'cta') throw new Error('every hook/content slide needs a heading');
  }
  return slides;
}
