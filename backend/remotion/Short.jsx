import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { getStyle } from './styles/index.js';

// Seconds of branded CTA end-scene appended when branding is present.
// Root.jsx's calculateMetadata must add the same amount.
export const CTA_SEC = 2.5;

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
            <S.Scene
              scene={scene}
              words={words.slice(scene.start, scene.end + 1)}
              sceneStartSec={i === 0 ? 0 : words[scene.start].start}
              sceneIndex={i}
            />
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
