import { MODES, getMode } from './modes.js';
import { getStyleDef } from './styles.js';
import { motionRegistry } from '../../remotion/motion/index.js';

// Language blocks are inserted into script/carousel prompts. English adds nothing
// (the mode's audience string already says "English").
const HINGLISH_BLOCK = `LANGUAGE (non-negotiable):
- Write in natural, conversational Hinglish — the Hindi-English mix a popular Indian YouTuber speaks. Latin script ONLY, no Devanagari.
- Keep numbers, technical terms, and finance/real-estate words in English; connect them with everyday spoken Hindi.
- Spell Hindi words the way people commonly type them (e.g. "ghar", "paisa", "zaroori", "kyunki", "sabse") so text-to-speech reads them naturally.
- It must sound like real talking, never like translated text.`;

const HINDI_BLOCK = `LANGUAGE (non-negotiable):
- Write in natural, spoken Hindi using Devanagari script — the way a popular Hindi documentary narrator on YouTube speaks.
- Keep brand names, place names, and technical/finance terms in English (Latin script) where Hindi speakers normally say them in English.
- It must sound like real storytelling, never like translated text. Short, punchy spoken sentences.`;

function languageBlock(language) {
  if (language === 'hinglish') return `\n${HINGLISH_BLOCK}\n`;
  if (language === 'hindi') return `\n${HINDI_BLOCK}\n`;
  return '';
}

function researchBlock(research) {
  return research && research.trim()
    ? `RESEARCH (raw notes, may be messy — extract what's true and interesting):
---
${research}
---`
    : `RESEARCH: none provided. Use only well-established, widely known facts and standard best practices for this topic.`;
}

export function scriptPrompt({ title, research, mode = 'normal', language = 'english' }) {
  const m = getMode(mode) || MODES.normal;
  const hasResearch = Boolean(research && research.trim());

  const rules = [
    '110 to 140 words total. Reads aloud in under 50 seconds.',
    'First sentence IS the hook: it must confirm the topic AND open a curiosity gap in one line. No greetings, no "in this video".',
    'Exactly ONE idea for the whole Short. One open loop, planted in the hook, paid off in the final line.',
    'Chain every beat with but/therefore, never "and then". Every sentence is either a new fact or a turn — zero filler, no "so", "now", "let\'s talk about".',
    'One sentence of grounding context max, then straight to the interesting part.',
    'Use one strong analogy OR one memorable label for the core concept, not both, not more.',
    'Include stakes or a relatable micro-moment ("why should I care").',
    'Vary sentence length: short punches mixed with longer lines.',
    'End on the payoff line itself — ideally reframing the hook. No summary, no "follow for more", no call to action.',
    ...(hasResearch
      ? [
          'If the research contains a striking number, use it — numbers make great visuals.',
          'Only make claims supported by the research. Do not invent facts, numbers, or quotes.',
        ]
      : ['Only make claims that are well-established general knowledge. Do not invent specific statistics, prices, or quotes.']),
    ...m.extraRules,
  ];

  return `${m.scriptIntro} (${m.audience[language] || m.audience.english}).

Write the voiceover script for a Short titled: "${title}"

${researchBlock(research)}
${languageBlock(language)}
RULES (non-negotiable):
${rules.map((r) => `- ${r}`).join('\n')}

OUTPUT FORMAT (strict):
- Output ONLY the spoken words of the script. No title, no headings, no stage directions, no visual notes, no markdown, no quotation marks around the whole thing, no emojis.
- Plain ASCII punctuation only (TTS-friendly). Write numbers the way they should be spoken when ambiguous (e.g. "19 90s" vs "1990s" — prefer "the nineteen nineties").`;
}

// Per-scene-type prompt descriptions. Only the types a style supports are emitted.
function typeDescriptions(styleDef) {
  const all = {
    headline: `- "headline": the spoken words appear as big kinetic typography, popping in word-by-word. The default type. Use "emphasis" to highlight 1-3 key words of the scene (${styleDef.accentDesc}).`,
    stat: styleDef.useIcons
      ? `- "stat": one big number/figure dominates the screen. Use ONLY when the words being spoken contain a number or quantity. "value" = the big text (e.g. "90%", "$3B", "12x"), "label" = 2-5 word caption, "icon" = ONE emoji that represents the stat (e.g. "🛢️", "📦", "💵").`
      : `- "stat": one big number/figure dominates the screen. Use ONLY when the words being spoken contain a number or quantity. "value" = the big text (e.g. "90%", "12x"), "label" = 2-5 word caption. No icons or emojis in this style.`,
    photo: `- "photo": a real archival photo (taped paper print, black & white). "query" = a 2-6 word Wikimedia Commons image search (name the SPECIFIC person, place, object, or event — e.g. "Malcom McLean portrait", "container ship 1960s"), "label" = 1-4 word caption shown on the photo. Use for people, places, objects, and historical moments mentioned in the script.`,
    chart: `- "chart": an animated line chart. Use ONLY if the research contains a real numeric series of 3+ points over time; never invent data. "title" = 2-5 word chart title, "points" = [{"label":"2016","value":1.8}, ...] (4-8 points), "value" = optional callout text for the final point.`,
    typewriter: `- "typewriter": the words type on like a typewriter, letter by letter. Reserve for ONE dramatic, ominous, or profound line (great for the hook or the payoff).`,
    card: `- "card": a short punchy phrase on a standout card, for quotes or the payoff line. "title" = optional 1-3 word kicker above the card text.`,
  };
  return styleDef.sceneTypes.map((t) => all[t]).join('\n');
}

export function scenesPrompt({ title, script, words, style = 'vox' }) {
  const styleDef = getStyleDef(style);
  const wordList = words.map((w, i) => `${i}:${w.word}`).join(' ');
  return `You are the scene designer for ${styleDef.sceneIntro}.

The voiceover is already recorded. Your job: split it into visual scenes. Each scene shows on screen while its words are spoken.

TITLE: ${title}

SCRIPT:
${script}

WORDS (index:word — scenes reference these indices):
${wordList}

SCENE TYPES:
${typeDescriptions(styleDef)}

RULES:
- 8 to 14 scenes covering ALL words: first scene starts at 0, last ends at ${words.length - 1}, no gaps, no overlaps.
- Cut at natural phrase boundaries (never mid-phrase). Scenes should each cover roughly 5-20 words (2-6 seconds).
- The hook (first scene) and the payoff (last scene) deserve strong treatment.
- ${styleDef.mixRule}
- "scheme" picks the color scheme: ${styleDef.schemeLegend}
- "emphasis" entries must be exact words that appear in that scene's index range.

OUTPUT (strict): ONLY a JSON object, no markdown fences, no commentary:
{"scenes":[{"type":"headline","start":0,"end":8,"emphasis":["wrong"],"scheme":0}, {"type":"stat","start":9,"end":15,"value":"90%","label":"of all cargo",${styleDef.useIcons ? '"icon":"📦",' : ''}"scheme":2}, ...]}`;
}

// Legend entry for a motion name that may be a KIND of the given category or a
// PRESET — exactly the two shapes the Style Bible schema allows in a style's
// motion preferences (all validated implemented at registration).
function motionLegendEntry(category, name) {
  const def = motionRegistry.get(category, name) || motionRegistry.get('preset', name);
  return def ? `"${name}" (${def.description})` : `"${name}"`;
}

// Motion Engine bullets for shotsPrompt, narrowed to the STYLE'S preferences:
// the planner is offered only the moves the Style Bible author chose for this
// look, with the style's own frequency guidance. Every value the planner emits
// is still validated against the full Motion Registry in src/core/scenes.js —
// unknown names are stripped there, and the engine degrades gracefully anyway.
function motionFieldLines(visual) {
  const m = visual.motion;
  const lines = [
    `- "motion": the camera move as a named preset — PREFERRED over "camera". This style's moves: ${m.cameraPresets
      .map((p) => motionLegendEntry('camera', p))
      .join(', ')}. Camera behaviour: ${visual.cameraBehaviour} Vary it across shots; still fill in "camera" as the fallback.`,
  ];
  if (m.transitions.length) {
    lines.push(
      `- "transition": optional entrance for the shot. One of: ${m.transitions
        .map((t) => motionLegendEntry('transition', t))
        .join(', ')}. Frequency: ${m.transitionFrequency}. Omit the field for a straight cut.`
    );
  }
  if (m.effects.length) {
    lines.push(
      `- "effect": optional full-frame overlay. One of: ${m.effects
        .map((e) => motionLegendEntry('effect', e))
        .join(', ')}. Frequency: ${m.effectFrequency}. Omit otherwise.`
    );
  }
  return lines.join('\n');
}

// Cinematic render style: instead of typographic scenes, plan a shot list where
// every shot is an AI-generated still + camera move + sparse caption.
//
// The prompt is composed ENTIRELY from a Style Bible definition (`visual`) —
// this function owns the scaffolding (word indices, JSON contract, coverage
// rules) and the definition owns every word of visual language. The planner
// never invents a look; changing the look means changing the definition.
export function shotsPrompt({ title, script, words, visual }) {
  const wordList = words.map((w, i) => `${i}:${w.word}`).join(' ');
  const v = visual;
  return `You are the director of a "${v.displayName}" vertical Reel (1080x1920): ${v.description}.

STYLE PHILOSOPHY:
${v.philosophy}

The voiceover is already recorded. Your job: split it into SHOTS. Each shot shows one full-screen image while its words are spoken. The viewer must understand the story with the sound OFF — the images carry the story, captions only punctuate it.

TITLE: ${title}

SCRIPT:
${script}

WORDS (index:word — shots reference these indices):
${wordList}

COMPOSITION (every shot):
${v.composition.map((r) => `- ${r}`).join('\n')}

FRAMING:
${v.framing.map((r) => `- ${r}`).join('\n')}

LIGHT & COLOR:
- Palette: ${v.colorPalette.description}. Tones: ${v.colorPalette.tones.join('; ')}. Accent: ${v.colorPalette.accent}.
${v.lighting.map((r) => `- ${r}`).join('\n')}

For each shot provide:
- "start"/"end": word indices (first shot starts at 0, last ends at ${words.length - 1}, no gaps, no overlaps).
- "imagePrompt": a vivid ENGLISH description of ONE image for an AI image generator — a ${v.imagePrompt.medium}.
${v.imagePrompt.rules.map((r) => `  * ${r}`).join('\n')}
  * NEVER ask for: ${v.forbidden.join('; ')}.
  * Subjects that fit this style (write your own in this spirit): ${v.imagePrompt.vocabulary.map((x) => `"${x}"`).join(', ')}.
- "query": a 2-4 word ENGLISH stock-photo search phrase for the same idea, using GENERIC visual concepts a stock site actually has ("empty video store", "man laughing office", "city skyline night") — never proper names of people or brands.
- "icons": 1-3 emoji that symbolize the shot (e.g. ["📼","💀"] for a dying video-rental giant) — used to build an illustrated fallback scene if no photo is available.
- "caption": 0-6 words shown over the image (${v.typography.captionStyle}).
${v.typography.rules.map((r) => `  * ${r}`).join('\n')}
- "emphasis": 0-2 exact caption words to tint in the accent color.
- "camera": one of "zoomIn", "zoomOut", "panLeft", "panRight" — vary it, never the same twice in a row. "zoomIn" for drama/tension, "zoomOut" for reveals, pans for places and passage of time.
${motionFieldLines(v)}

CONSISTENCY (non-negotiable — this is one film, not sixteen images):
${v.consistency.rules.map((r) => `- ${r}`).join('\n')}

RULES:
- 10 to 16 shots covering ALL words. Each shot covers roughly 5-14 words (2-5 seconds). Overall pace of this style: ${v.motion.pace}.
- The hook (shot 1) must be the most arresting image of all.

OUTPUT (strict): ONLY a JSON object, no markdown fences, no commentary:
{"shots":[{"start":0,"end":9,"imagePrompt":"...","query":"businessman dark office","icons":["💼"],"caption":"In 2000","emphasis":["2000"],"camera":"zoomIn","motion":"${v.motion.cameraPresets[0]}","transition":"${v.motion.transitions[0] || 'fade'}"}, ...]}`;
}

export function carouselPrompt({ title, research, mode = 'normal', language = 'english' }) {
  const m = getMode(mode) || MODES.normal;
  const branded = Boolean(m.branded);

  const roles = [
    `- "hook" (first slide only): "heading" is a bold claim or question, 8 words max, that makes people stop scrolling and swipe. "body" is one teaser line of 15 words max, or empty.`,
    `- "content": ONE tip or idea per slide. "heading" 8 words max, "body" 35 words max — concrete and specific, no fluff. Do NOT number the headings ("1.", "2)") — the design numbers each slide automatically.`,
    ...(branded
      ? [
          `- "cta" (last slide only): "heading" is a short warm closing line inviting people to reach out (e.g. "Ready to find your home?"). Leave "body" EMPTY — contact details are added automatically. NEVER write phone numbers, addresses, or handles.`,
        ]
      : [
          `- The LAST slide is a "content" slide that delivers the payoff — the strongest takeaway, reframing the hook.`,
        ]),
  ];

  const rules = [
    `${branded ? '6 to 8' : '5 to 8'} slides total. First slide role = "hook"${branded ? ', last slide role = "cta"' : ''}, everything between = "content".`,
    'The slides must tell one connected story: the hook opens a gap, the content slides pay it off step by step.',
    'Write for people reading on a phone: short lines, everyday words, no jargon without a quick explanation.',
    ...(research && research.trim()
      ? ['Only make claims supported by the research. Do not invent facts, numbers, or quotes.']
      : ['Only make claims that are well-established general knowledge. Do not invent specific statistics, prices, or quotes.']),
    'Plain ASCII only. No emojis, no markdown, no hashtags.',
    ...m.extraRules,
  ];

  return `${m.scriptIntro} (${m.audience[language] || m.audience.english}). This time you are designing an Instagram CAROUSEL — a set of static slides people swipe through (1080x1350 each). There is no voiceover; the slides carry everything.

TOPIC: "${title}"

${researchBlock(research)}
${languageBlock(language)}
SLIDE ROLES:
${roles.join('\n')}

RULES (non-negotiable):
${rules.map((r) => `- ${r}`).join('\n')}

OUTPUT (strict): ONLY a JSON object, no markdown fences, no commentary:
{"slides":[{"role":"hook","heading":"...","body":"..."},{"role":"content","heading":"...","body":"..."}${branded ? ',{"role":"cta","heading":"...","body":""}' : ''}]}`;
}
