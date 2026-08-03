import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { MotionEffect } from './motion/hooks.js';
import { Backdrop, Label } from './MotionDemo.jsx';

// Phase 2D-2 technical-validation demo — the Motion Effect Library.
// Seven plain, labeled segments over the MotionDemo grid backdrop, proving
// every new effect end to end in a real render (filmGrain was proven in 2B):
//   1. blur      2. glow      3. noise
//   4. dust      5. embers    6. snow   (particle presets, as the planner emits them)
//   7. vignette
// ALL animation goes through the Motion Engine via MotionEffect; this file
// contains zero hand-rolled animation math. The label sits ABOVE the overlay
// on purpose: backdrop-filter effects (blur, glow) must only touch what is
// painted beneath them, and a sharp label over a blurred backdrop proves it.

export const EFFECTS_DEMO_SEGMENT_SEC = 3;
export const EFFECTS_DEMO_SEGMENTS = 7;

// Specs hoisted so useResolvedMotion's memo key is stable across frames.
// Params pushed above defaults so each effect is unmistakable on stills.
const BLUR_SPEC = Object.freeze({ category: 'effect', kind: 'blur', easing: 'easeOut', params: { radiusPx: 16 } });
const GLOW_SPEC = Object.freeze({ category: 'effect', kind: 'glow', easing: 'easeInOut', params: { radiusPx: 20, opacity: 0.85, strength: 0.9 } });
const NOISE_SPEC = Object.freeze({ category: 'effect', kind: 'noise', params: { opacity: 0.32 } });
const VIGNETTE_SPEC = Object.freeze({ category: 'effect', kind: 'vignette', easing: 'easeOut', params: { strength: 0.85, softness: 0.5 } });

const SEGMENTS = [
  { spec: BLUR_SPEC, label: '1 / BLUR (FOCUS IN)' },
  { spec: GLOW_SPEC, label: '2 / GLOW (BUILDS)' },
  { spec: NOISE_SPEC, label: '3 / NOISE' },
  { spec: 'dust', label: '4 / DUST (PRESET)' },
  { spec: 'embers', label: '5 / EMBERS (PRESET)' },
  { spec: 'snow', label: '6 / SNOW (PRESET)' },
  { spec: VIGNETTE_SPEC, label: '7 / VIGNETTE (EASES IN)' },
];

function EffectSegment({ spec, label }) {
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop />
      <MotionEffect spec={spec} />
      <Label>{label}</Label>
    </AbsoluteFill>
  );
}

export function EffectsDemo() {
  const { fps } = useVideoConfig();
  const seg = EFFECTS_DEMO_SEGMENT_SEC * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {SEGMENTS.map(({ spec, label }, i) => (
        <Sequence key={label} from={seg * i} durationInFrames={seg}>
          <EffectSegment spec={spec} label={label} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
