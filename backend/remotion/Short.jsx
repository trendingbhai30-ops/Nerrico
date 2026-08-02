import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { getStyle } from './styles/index.js';
import { MotionEffect, useTransitionMotion } from './motion/hooks.js';

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
  const transitionSpec = useMemo(
    () =>
      scene.transition
        ? { category: 'transition', kind: scene.transition, durationInSeconds: SCENE_TRANSITION_SEC }
        : null,
    [scene.transition]
  );
  const effectSpec = useMemo(
    () => (scene.effect ? { category: 'effect', kind: scene.effect } : null),
    [scene.effect]
  );
  const enter = useTransitionMotion(transitionSpec, 'in');
  return (
    <AbsoluteFill
      style={{
        opacity: enter.opacity,
        transform: enter.transform || undefined,
        filter: enter.filter || undefined,
      }}
    >
      {children}
      {effectSpec ? <MotionEffect spec={effectSpec} /> : null}
    </AbsoluteFill>
  );
}

export function Short({ audioUrl, words, scenes, durationSec, style = 'vox', branding = null }) {
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
    </AbsoluteFill>
  );
}
