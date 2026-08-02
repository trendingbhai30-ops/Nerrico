import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { CameraSegment } from './MotionDemo.jsx';

// Phase 2C technical-validation demo — the Advanced Camera Motion Library.
// Six plain, labeled segments over the same grid backdrop as MotionDemo,
// proving every new camera kind end to end in a real render:
//   1. rotate      2. orbit       3. push (in)
//   4. push (out)  5. focusPull   6. shake
// ALL animation goes through the Motion Engine via useCameraMotion (inside
// CameraSegment); this file contains zero hand-rolled animation math.

export const CAMERA_DEMO_SEGMENT_SEC = 3;
export const CAMERA_DEMO_SEGMENTS = 6;

// Raw kind specs (not presets) with intensity 1 so each motion's default
// character is what lands on the frames. Hoisted so the resolve memo is stable.
const ROTATE_SPEC = Object.freeze({ category: 'camera', kind: 'rotate', direction: 'cw' });
const ORBIT_SPEC = Object.freeze({ category: 'camera', kind: 'orbit', direction: 'cw' });
const PUSH_IN_SPEC = Object.freeze({ category: 'camera', kind: 'push', direction: 'in' });
const PULL_OUT_SPEC = Object.freeze({ category: 'camera', kind: 'push', direction: 'out' });
const FOCUS_PULL_SPEC = Object.freeze({ category: 'camera', kind: 'focusPull', direction: 'in' });
// linear easing: shake's decay envelope is its own curve; easing on top distorts it.
const SHAKE_SPEC = Object.freeze({ category: 'camera', kind: 'shake', easing: 'linear' });

const SEGMENTS = [
  { spec: ROTATE_SPEC, label: '1 / ROTATE (CW)' },
  { spec: ORBIT_SPEC, label: '2 / ORBIT' },
  { spec: PUSH_IN_SPEC, label: '3 / PUSH IN' },
  { spec: PULL_OUT_SPEC, label: '4 / PULL OUT' },
  { spec: FOCUS_PULL_SPEC, label: '5 / FOCUS PULL' },
  { spec: SHAKE_SPEC, label: '6 / CAMERA SHAKE' },
];

export function CameraDemo() {
  const { fps } = useVideoConfig();
  const seg = CAMERA_DEMO_SEGMENT_SEC * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {SEGMENTS.map(({ spec, label }, i) => (
        <Sequence key={label} from={seg * i} durationInFrames={seg}>
          <CameraSegment spec={spec} label={label} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
