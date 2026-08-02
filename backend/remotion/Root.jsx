import React from 'react';
import { Composition } from 'remotion';
import { Short, CTA_SEC } from './Short.jsx';
import { Slide } from './Slide.jsx';
import { MotionDemo, MOTION_DEMO_SEGMENT_SEC, MOTION_DEMO_SEGMENTS } from './MotionDemo.jsx';

const FPS = 30;

export function Root() {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 50}
        defaultProps={{
          audioUrl: null,
          durationSec: 3,
          style: 'vox',
          branding: null,
          words: [
            { word: 'NERRICO', start: 0.1, end: 0.5 },
            { word: 'TEST', start: 0.6, end: 1.0 },
            { word: 'RENDER', start: 1.1, end: 1.5 },
          ],
          scenes: [{ type: 'headline', start: 0, end: 2, emphasis: ['test'], scheme: 0 }],
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(
            FPS,
            Math.ceil((props.durationSec + 1 + (props.branding ? CTA_SEC : 0)) * FPS)
          ),
        })}
      />
      <Composition
        id="MotionDemo"
        component={MotionDemo}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * MOTION_DEMO_SEGMENT_SEC * MOTION_DEMO_SEGMENTS}
        defaultProps={{}}
      />
      <Composition
        id="Slide"
        component={Slide}
        width={1080}
        height={1350}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{
          slide: { role: 'hook', heading: 'Nerrico slide test', body: 'A test slide body' },
          index: 0,
          total: 5,
          style: 'vox',
          branding: null,
        }}
      />
    </>
  );
}
