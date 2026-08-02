// Visual style registry (backend side): which scene types each style supports
// and how its color schemes are described to the scene-planning prompt.
// The matching Remotion components live in remotion/styles/.

export const STYLES = {
  vox: {
    id: 'vox',
    name: 'Vox Paper',
    description: 'Paper-cutout documentary look — kinetic typography, archival photos',
    look: 'paper-cutout look, kinetic typography',
    sceneTypes: ['headline', 'stat', 'card', 'photo', 'chart', 'typewriter'],
    schemeCount: 4,
    schemeLegend:
      '0 = warm gray paper with grid (THE DEFAULT — use for most scenes, including all photo/chart/typewriter scenes), 1 = near-black, 2 = orange, 3 = brick red. Use 1-3 only for the 2-4 most dramatic beats; never two non-paper schemes in a row.',
    useIcons: true,
    sceneIntro: 'a Vox-style animated YouTube Short (paper-cutout look, kinetic typography, 1080x1920)',
    accentDesc: 'orange highlight bar',
    mixRule:
      'Use 2-4 "photo" scenes — real imagery is the soul of this style. "stat" at most twice, "chart" at most once, "typewriter" at most once, "card" at most twice.',
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury Minimal',
    description: 'Premium charcoal, cream & gold — elegant serif type, slow cinematic zooms',
    look: 'luxury minimal look — elegant serif typography, generous whitespace, thin gold rules, slow cinematic zooms',
    sceneTypes: ['headline', 'stat', 'card', 'typewriter'],
    schemeCount: 3,
    schemeLegend:
      '0 = warm cream (THE DEFAULT — use for most scenes), 1 = deep charcoal, 2 = gold panel. Use 1-2 only for the 2-3 most dramatic beats; never two non-cream schemes in a row.',
    useIcons: false,
    sceneIntro:
      'a luxury minimal animated vertical Reel (elegant serif typography, charcoal/cream/gold palette, slow cinematic zooms, 1080x1920)',
    accentDesc: 'gold accent',
    mixRule: '"stat" at most twice, "typewriter" at most once, "card" at most twice.',
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Documentary',
    description: 'AI-image documentary — photoreal stills, Ken Burns camera, film grain, dark cinematic grade',
    look: 'cinematic documentary — AI-generated photoreal stills, slow camera moves, film grain, sparse serif captions',
    sceneTypes: ['shot'],
    schemeCount: 1,
    schemeLegend: '0 only',
    useIcons: false,
    sceneIntro: 'a cinematic documentary vertical Reel (photoreal stills, slow camera moves, 1080x1920)',
    accentDesc: 'filmic red accent',
    mixRule: 'shots only',
  },
};

export function getStyleDef(id) {
  return STYLES[id] || STYLES.vox;
}
