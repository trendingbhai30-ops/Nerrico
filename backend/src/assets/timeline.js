// Nerrico Asset Engine — asset timeline (Phase 4C).
//
// Turns a planned project (scenes + word timings + music plan + style) into
// the exact asset timeline a render consumes: { music, sfx, icons }, every
// entry a provider object (src URL + start/end/volume/loop/fades/enabled/
// priority). Pure function of its inputs — same project, same timeline,
// every time. Nothing here touches the filesystem or the renderer; the
// pipeline passes the result into Remotion as inputProps.
//
// Layer sources:
//   music  the persisted musicPlan (Phase 4B policy decision), re-derived
//          through selectMusic when a legacy project has none
//   sfx    motion-driven events (scene transition/motion/effect through the
//          style-gated Motion→SFX table) + planner content accents (scene.sfx)
//   icons  scenes referencing SEMANTIC icon refs ("icon.money"); emoji and
//          free-text icon hints are not assets and are left to the
//          compositions, exactly as before

import { assetRegistry } from './registry.js';
import { selectMusic, motionSfxEvent, resolveInCategory } from './intelligence.js';
import { provideMusic, provideSfx, provideIcon, PROVIDER_MIX } from './provider.js';

/** Scene start in seconds — the same rule Short.jsx uses to place Sequences. */
function sceneStartSec(scenes, words, i) {
  if (i === 0) return 0;
  return words[scenes[i].start]?.start ?? 0;
}

function sceneEndSec(scenes, words, i, durationSec) {
  if (i < scenes.length - 1) return words[scenes[i + 1].start]?.start ?? durationSec;
  return durationSec;
}

const SEMANTIC_ICON_REF = /^icons?\./;

/**
 * @param {object} opts
 *   scenes        validated scenes.json content
 *   words         voiceover word timings ([{word,start,end}])
 *   durationSec   voiceover duration
 *   style         Style Bible definition (or name) — gates motion SFX, styles music
 *   musicPlan     persisted Phase 4B decision ({policy,source,ref,assetId}) or null
 *   projectMusic  the project's raw music setting (legacy fallback path)
 *   baseUrl       src URL prefix ('' = relative; the pipeline passes the local server)
 *   registry      override for tests
 * @returns {{music: object[], sfx: object[], icons: object[]}} JSON-safe, deterministic.
 */
export function buildAssetTimeline({
  scenes = [],
  words = [],
  durationSec = 0,
  style = null,
  musicPlan = null,
  projectMusic = null,
  baseUrl = '',
  registry = assetRegistry,
} = {}) {
  const music = [];
  const sfx = [];
  const icons = [];

  // ---- music: one looping bed for the whole video (or silence) -------------
  // The persisted plan wins; a legacy project (no plan) re-runs the Phase 4B
  // selection policy, which is itself deterministic for the same inputs.
  const plan = musicPlan && musicPlan.policy
    ? musicPlan
    : selectMusic({ project: projectMusic, style, registry });
  if (plan.policy !== 'none' && plan.assetId) {
    const bed = provideMusic(plan.assetId, { baseUrl, registry });
    if (bed) music.push(Object.freeze({ ...bed, source: plan.source ?? null, policyRef: plan.ref ?? null }));
  }

  // ---- sfx: motion events + planner content accents, in scene order --------
  const seen = new Set(); // one sound per (asset, moment) — transition+preset can map to the same event
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const start = sceneStartSec(scenes, words, i);

    for (const motionName of [s.transition, s.motion, s.effect]) {
      if (!motionName) continue;
      // Semantic event first (style-gated), then resolve in THIS registry —
      // the sfxForMotion seam is equivalent but is pinned to the singleton.
      const event = motionSfxEvent(motionName, style);
      if (!event || !event.sfx) continue; // silent by design / style-gated
      const record = resolveInCategory(registry, event.sfx, 'sfx');
      if (!record) continue; // library gap — degrade to silence, never crash
      const key = `${record.id}@${start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hit = provideSfx(record, { baseUrl, registry, start, ...PROVIDER_MIX.motionSfx });
      if (hit) sfx.push(Object.freeze({ ...hit, scene: i, event: 'motion', motion: motionName }));
    }

    if (s.sfx) {
      const key = `${s.sfx}@${start}`;
      if (!seen.has(key)) {
        seen.add(key);
        const accent = provideSfx(s.sfx, { baseUrl, registry, start });
        if (accent) sfx.push(Object.freeze({ ...accent, scene: i, event: 'scene' }));
      }
    }
  }

  // ---- icons: semantic refs only — render-ready, scene-timed ---------------
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const refs = [...(Array.isArray(s.icons) ? s.icons : []), ...(s.icon ? [s.icon] : [])];
    for (const ref of refs) {
      if (typeof ref !== 'string' || !SEMANTIC_ICON_REF.test(ref)) continue; // emoji/free text → compositions, as before
      const icon = provideIcon(ref, {
        baseUrl,
        registry,
        start: sceneStartSec(scenes, words, i),
        end: sceneEndSec(scenes, words, i, durationSec),
      });
      if (icon) icons.push(Object.freeze({ ...icon, scene: i }));
    }
  }

  return { music, sfx, icons };
}
