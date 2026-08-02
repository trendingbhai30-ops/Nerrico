// Content modes and the fixed option lists exposed to the frontend.
// A mode shapes WHO the content is for and WHAT the script prompt asks for;
// visual styles live in styles.js.

export const LANGUAGES = ['english', 'hinglish', 'hindi'];
export const FORMATS = ['reel', 'carousel'];

export const MODES = {
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'Vox-style explainer Shorts on any topic',
    branded: false,
    researchOptional: false,
    // "(English, US audience)" must match the original prompt exactly for regression.
    audience: { english: 'English, US audience', hinglish: 'Hinglish, Indian audience', hindi: 'Hindi, Indian audience' },
    scriptIntro:
      'You are the scriptwriter for "Nerrico", a channel of 45-50 second Vox-style explainer YouTube Shorts',
    extraRules: [],
  },
  realestate: {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Buyer & investor tips for Kastoori Real Estate',
    branded: true,
    researchOptional: true, // evergreen tips — a good title alone is enough
    audience: { english: 'English, Indian audience', hinglish: 'Hinglish, Indian audience', hindi: 'Hindi, Indian audience' },
    scriptIntro:
      'You are the scriptwriter for "Kastoori Real Estate", an Indian real-estate agency posting 45-50 second educational Reels of practical tips for home buyers and property investors',
    extraRules: [
      'Give practical, specific, actionable advice an Indian home buyer or property investor can actually use. Prefer concrete specifics (percentages, documents to check, timelines) over vague advice.',
      'Sound like a trusted local expert sharing insider knowledge, never like an advertisement. Do NOT pitch Kastoori or add any call to action in the script — branding is added visually after.',
      'Use Indian real-estate terms naturally where relevant (carpet area vs built-up area, RERA, registry, home loan, EMI, builder, possession, society).',
      'Background context about the brand — do NOT mention or advertise this in the script, but never contradict it: Kastoori Real Estate is a channel partner for builder projects, works mainly in Chandkheda and Zundal (Ahmedabad), and charges no brokerage to its clients.',
    ],
  },
};

export function getMode(id) {
  return MODES[id] || null;
}
