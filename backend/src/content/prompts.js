import { MODES, getMode } from './modes.js';
import { getStyleDef } from './styles.js';

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

// Cinematic style: instead of typographic scenes, plan a shot list where every
// shot is an AI-generated documentary still + camera move + sparse caption.
export function shotsPrompt({ title, script, words }) {
  const wordList = words.map((w, i) => `${i}:${w.word}`).join(' ');
  return `You are the director of a cinematic documentary vertical Reel (1080x1920) in the style of premium story-driven channels: AI-generated photorealistic stills, slow camera moves, dark moody grade, sparse elegant serif captions.

The voiceover is already recorded. Your job: split it into SHOTS. Each shot shows one full-screen cinematic image while its words are spoken. The viewer must understand the story with the sound OFF — the images carry the story, captions only punctuate it.

TITLE: ${title}

SCRIPT:
${script}

WORDS (index:word — shots reference these indices):
${wordList}

For each shot provide:
- "start"/"end": word indices (first shot starts at 0, last ends at ${words.length - 1}, no gaps, no overlaps).
- "imagePrompt": a vivid ENGLISH description of ONE photorealistic cinematic image for an AI image generator. Describe: the main subject, the setting, the composition (close-up / wide / low angle...), the lighting and mood. Concrete and visual — a film still, not a diagram. NEVER ask for text, words, numbers, logos, or UI inside the image. Vertical composition.
- "query": a 2-4 word ENGLISH stock-photo search phrase for the same idea, using GENERIC visual concepts a stock site actually has ("empty video store", "man laughing office", "city skyline night") — never proper names of people or brands.
- "icons": 1-3 emoji that symbolize the shot (e.g. ["📼","💀"] for a dying video-rental giant) — used to build an illustrated fallback scene if no photo is available.
- "caption": 0-6 words shown in elegant serif over the image ("In 2000", "closed 1000 stores"). Punchy fragments, not sentences. Give a caption to roughly 2 of every 3 shots; leave it "" when the image speaks for itself.
- "emphasis": 0-2 exact caption words to tint in the accent color.
- "camera": one of "zoomIn", "zoomOut", "panLeft", "panRight" — vary it, never the same twice in a row. "zoomIn" for drama/tension, "zoomOut" for reveals, pans for places and passage of time.

RULES:
- 10 to 16 shots covering ALL words. Each shot covers roughly 5-14 words (2-5 seconds). Short shots = fast pacing = retention.
- Tell one visual story: characters and places should RECUR across shots (same protagonist described consistently, e.g. "the same middle-aged businessman in a dark suit").
- Think like the reference channels: dramatic portraits, symbolic objects (vintage newspapers, keys, stacks of cash, empty stores), city skylines, close-ups of hands/faces. Metaphors welcome (a sinking paper boat for a failing company).
- The hook (shot 1) must be the most arresting image of all.

OUTPUT (strict): ONLY a JSON object, no markdown fences, no commentary:
{"shots":[{"start":0,"end":9,"imagePrompt":"low angle close-up of a weathered businessman...","query":"businessman dark office","icons":["💼"],"caption":"In 2000","emphasis":["2000"],"camera":"zoomIn"}, ...]}`;
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
