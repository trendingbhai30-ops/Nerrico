import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { getStyle } from './styles/index.js';
import { AssetAudioLayer } from './assets-audio.jsx';
import { MotionEffect, TransitionShell, useTransitionMotion } from './motion/hooks.js';
import { motionRegistry } from './motion/registry.js';

// Seconds of branded CTA end-scene appended when branding is present.
// Root.jsx's calculateMetadata must add the same amount.
export const CTA_SEC = 2.5;

// Entrance transitions driven from Short.jsx run this long unless the spec
// says otherwise (a null duration would span the whole scene — wrong for a
// transition).
const SCENE_TRANSITION_SEC = 0.4;

// Scene-level Motion Engine wrapper: entrance transition + full-frame effect,
// both planner-emitted and registry-validated upstream (src/core/scenes.js).
// Scenes without motion fields resolve to the shared identity state — no
// visual change for pre-2.5 projects.
function SceneMotion({ scene, children }) {
  // scene.transition is a kind name ('slide') or, since Phase 2D-1, possibly a
  // transition preset ('heroReveal'). A preset carries its own taste (duration,
  // easing, params) — pass the shorthand string through untouched; a bare kind
  // gets the standard entrance duration.
  const transitionSpec = useMemo(() => {
    if (!scene.transition) return null;
    if (motionRegistry.has('preset', scene.transition)) return scene.transition;
    return { category: 'transition', kind: scene.transition, durationInSeconds: SCENE_TRANSITION_SEC };
  }, [scene.transition]);
  // scene.effect follows the same contract as of Phase 2D-2: a kind name
  // ('vignette') or an effect-category preset ('dust') — presets pass through
  // as shorthand so they keep their own easing/params.
  const effectSpec = useMemo(() => {
    if (!scene.effect) return null;
    if (motionRegistry.has('preset', scene.effect)) return scene.effect;
    return { category: 'effect', kind: scene.effect };
  }, [scene.effect]);
  const enter = useTransitionMotion(transitionSpec, 'in');
  // TransitionShell (motion/hooks.js) renders the FULL TransitionState —
  // opacity/transform/filter plus the Phase 2D-1 fields (clipPath, flash
  // overlay, whip's directional-blur SVG def).
  return (
    <TransitionShell state={enter}>
      {children}
      {effectSpec ? <MotionEffect spec={effectSpec} /> : null}
    </TransitionShell>
  );
}

export function Short({ audioUrl, words, scenes, durationSec, style = 'vox', branding = null, assets = null }) {
  const { fps } = useVideoConfig();
  const S = getStyle(style);
  const contentEndF = Math.round((durationSec + 1) * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: '#191712' }}>
      {scenes.map((scene, i) => {
        const startF = i === 0 ? 0 : Math.round(words[scene.start].start * fps);
        const endSec =
          i < scenes.length - 1 ? words[scenes[i + 1].start].start : durationSec + 1;
        const endF = Math.round(endSec * fps);
        return (
          <Sequence key={i} from={startF} durationInFrames={Math.max(endF - startF, 8)}>
            <SceneMotion scene={scene}>
              <S.Scene
                scene={scene}
                words={words.slice(scene.start, scene.end + 1)}
                sceneStartSec={i === 0 ? 0 : words[scene.start].start}
                sceneIndex={i}
              />
            </SceneMotion>
          </Sequence>
        );
      })}
      {branding ? (
        <Sequence from={contentEndF} durationInFrames={Math.round(CTA_SEC * fps)}>
          <S.CtaScene branding={branding} />
        </Sequence>
      ) : null}
      {branding ? (
        <Sequence from={0} durationInFrames={contentEndF}>
          <S.Watermark branding={branding} />
        </Sequence>
      ) : null}
      <S.ProgressBar />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      {/* Asset Engine timeline (Phase 4C): music bed + SFX accents. `assets`
          defaults to null, so pre-4C projects render byte-identically. */}
      <AssetAudioLayer assets={assets} />
    </AbsoluteFill>
  );
}
