import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { TransitionShell, useTransitionMotion } from './motion/hooks.js';
import { Backdrop, Label } from './MotionDemo.jsx';

// Phase 2D-1 technical-validation demo — the Motion Transition Library.
// Six plain, labeled segments over the MotionDemo grid backdrop, proving
// every new transition end to end in a real render (fade was proven in 2B):
//   1. slide (up)   2. whip (left)   3. flash
//   4. paperReveal  5. morph         6. heroReveal (preset → slide)
// ALL animation goes through the Motion Engine via useTransitionMotion +
// TransitionShell; this file contains zero hand-rolled animation math.

export const TRANSITION_DEMO_SEGMENT_SEC = 3;
export const TRANSITION_DEMO_SEGMENTS = 6;

// Explicit durations (a null duration would span the whole segment — the
// settle-and-hold after each transition is what proves it lands clean).
// Hoisted so the resolve memo is stable.
const SLIDE_SPEC = Object.freeze({ kind: 'slide', direction: 'up', durationInSeconds: 1.2, easing: 'easeOut' });
const WHIP_SPEC = Object.freeze({ kind: 'whip', direction: 'left', durationInSeconds: 0.7, easing: 'easeInOut' });
// linear easing: flash's rise/decay curve is its own shape; easing on top distorts it.
const FLASH_SPEC = Object.freeze({ kind: 'flash', durationInSeconds: 1, easing: 'linear' });
const PAPER_SPEC = Object.freeze({ kind: 'paperReveal', direction: 'right', durationInSeconds: 1.4, easing: 'easeInOut' });
const MORPH_SPEC = Object.freeze({ kind: 'morph', durationInSeconds: 1.2, easing: 'easeOut' });

const SEGMENTS = [
  { spec: SLIDE_SPEC, label: '1 / SLIDE (UP)' },
  { spec: WHIP_SPEC, label: '2 / WHIP (LEFT)' },
  { spec: FLASH_SPEC, label: '3 / FLASH' },
  { spec: PAPER_SPEC, label: '4 / PAPER REVEAL' },
  { spec: MORPH_SPEC, label: '5 / MORPH' },
  { spec: 'heroReveal', label: '6 / HERO REVEAL (PRESET)' },
];

// The transition hook drives the shell; the label rides inside the shell so
// the travel is visible on it too.
function TransitionSegment({ spec, label }) {
  const state = useTransitionMotion(spec, 'in');
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <TransitionShell state={state}>
        <Backdrop />
        <Label>{label}</Label>
      </TransitionShell>
    </AbsoluteFill>
  );
}

export function TransitionDemo() {
  const { fps } = useVideoConfig();
  const seg = TRANSITION_DEMO_SEGMENT_SEC * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {SEGMENTS.map(({ spec, label }, i) => (
        <Sequence key={label} from={seg * i} durationInFrames={seg}>
          <TransitionSegment spec={spec} label={label} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
