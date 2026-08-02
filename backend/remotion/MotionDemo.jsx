import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { MotionEffect, useCameraMotion, useTransitionMotion } from './motion/hooks.js';

// Phase 2B technical-validation demo. NOT a cinematic sequence — four plain,
// labeled segments proving the first implemented NME motions end to end:
//   1. slow zoom (preset 'slowZoom' → camera 'zoom')
//   2. pan (camera 'pan', direction via spec)
//   3. fade (transition 'fade', in + out with explicit durations)
//   4. film grain (effect 'filmGrain' overlay)
// ALL animation goes through the Motion Engine; this file contains zero
// hand-rolled animation math.

export const MOTION_DEMO_SEGMENT_SEC = 3;
export const MOTION_DEMO_SEGMENTS = 4;

// Specs are hoisted so useResolvedMotion's memo key is stable across frames.
const PAN_SPEC = Object.freeze({ category: 'camera', kind: 'pan', direction: 'left' });
const FADE_IN_SPEC = Object.freeze({ kind: 'fade', durationInSeconds: 1, easing: 'easeInOut' });
const FADE_OUT_SPEC = Object.freeze({
  kind: 'fade',
  durationInSeconds: 1,
  delayInSeconds: MOTION_DEMO_SEGMENT_SEC - 1,
  easing: 'easeInOut',
});
const GRAIN_SPEC = Object.freeze({
  category: 'effect',
  kind: 'filmGrain',
  params: { opacity: 0.22 }, // above default so it's unmistakable on frames
});

// A backdrop where movement is impossible to miss: grid lines, a centered
// disc, and corner markers (so zoom origin and pan direction read clearly).
// Exported for reuse by CameraDemo.jsx (Phase 2C).
export function Backdrop() {
  return (
    <AbsoluteFill style={{ backgroundColor: '#182432' }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 120px), repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 120px)',
        }}
      />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #E8734A, #9E3A20 70%)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          }}
        />
      </AbsoluteFill>
      {[
        { left: 40, top: 40 },
        { right: 40, top: 40 },
        { left: 40, bottom: 40 },
        { right: 40, bottom: 40 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: 90,
            height: 90,
            border: '6px solid rgba(255,255,255,0.55)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

export function Label({ children }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 120,
        width: '100%',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: 64,
        letterSpacing: 4,
        color: '#FFFFFF',
        textShadow: '0 4px 18px rgba(0,0,0,0.9)',
      }}
    >
      {children}
    </div>
  );
}

// Segments 1 & 2: the camera hook drives the wrapper transform. No math here.
// `filter` is applied too so focus pulls work (it is '' for every other kind).
// Exported for reuse by CameraDemo.jsx (Phase 2C).
export function CameraSegment({ spec, label }) {
  const { transform, transformOrigin, filter } = useCameraMotion(spec);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform, transformOrigin, filter: filter || undefined }}>
        <Backdrop />
      </AbsoluteFill>
      <Label>{label}</Label>
    </AbsoluteFill>
  );
}

// Segment 3: fade in over 1s, hold, fade out over the last 1s — both states
// come from the transition hook.
function FadeSegment({ label }) {
  const fadeIn = useTransitionMotion(FADE_IN_SPEC, 'in');
  const fadeOut = useTransitionMotion(FADE_OUT_SPEC, 'out');
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ opacity: fadeIn.opacity * fadeOut.opacity }}>
        <Backdrop />
        <Label>{label}</Label>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// Segment 4: static backdrop + the engine's film-grain overlay.
function GrainSegment({ label }) {
  return (
    <AbsoluteFill>
      <Backdrop />
      <MotionEffect spec={GRAIN_SPEC} />
      <Label>{label}</Label>
    </AbsoluteFill>
  );
}

export function MotionDemo() {
  const { fps } = useVideoConfig();
  const seg = MOTION_DEMO_SEGMENT_SEC * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence durationInFrames={seg}>
        <CameraSegment spec="slowZoom" label="1 / SLOW ZOOM" />
      </Sequence>
      <Sequence from={seg} durationInFrames={seg}>
        <CameraSegment spec={PAN_SPEC} label="2 / PAN (LEFT)" />
      </Sequence>
      <Sequence from={seg * 2} durationInFrames={seg}>
        <FadeSegment label="3 / FADE IN + OUT" />
      </Sequence>
      <Sequence from={seg * 3} durationInFrames={seg}>
        <GrainSegment label="4 / FILM GRAIN" />
      </Sequence>
    </AbsoluteFill>
  );
}
