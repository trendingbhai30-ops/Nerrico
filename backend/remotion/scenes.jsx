import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  CARD_BG,
  HEADLINE_FONT,
  LABEL_FONT,
  ORANGE,
  TYPEWRITER_FONT,
  contrastOn,
  scheme,
} from './theme.js';
import { useCameraMotion } from './motion/hooks.js';

const clean = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

export function headlineFontSize(words) {
  const chars = words.reduce((n, w) => n + w.word.length + 1, 0);
  return Math.max(52, Math.min(116, Math.round(880 / Math.sqrt(chars + 1))));
}

// ---------- background layers ----------

function Grain() {
  return (
    <AbsoluteFill style={{ opacity: 0.055, pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

function GridPaper({ ink }) {
  const line = `${ink}12`;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`,
        backgroundSize: '72px 72px',
      }}
    />
  );
}

function Vignette() {
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.16) 100%)',
      }}
    />
  );
}

export function SceneShell({ schemeIndex, children, center = true }) {
  const frame = useCurrentFrame();
  const s = scheme(schemeIndex);
  const settle = interpolate(frame, [0, 6], [1.02, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: s.bg, overflow: 'hidden' }}>
      {s.paper ? <GridPaper ink={s.ink} /> : null}
      <Grain />
      <AbsoluteFill
        style={{
          transform: `scale(${settle})`,
          justifyContent: center ? 'center' : 'flex-start',
          alignItems: 'center',
          padding: '150px 84px',
        }}
      >
        {children}
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
}

// ---------- kinetic typography ----------

function KineticWord({ w, sceneStartSec, emphasized, colors, fontSize }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = Math.max(0, Math.round((w.start - sceneStartSec) * fps) - 2);
  const pop = spring({
    frame: frame - appear,
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.6 },
    durationInFrames: 14,
  });
  const visible = frame >= appear;
  return (
    <span
      style={{
        display: 'inline-block',
        margin: `${fontSize * 0.06}px ${fontSize * 0.13}px`,
        padding: emphasized ? `0 ${fontSize * 0.12}px` : 0,
        backgroundColor: emphasized ? colors.accent : 'transparent',
        color: emphasized ? contrastOn(colors.accent) : colors.ink,
        boxShadow: emphasized ? '5px 6px 0 rgba(0,0,0,0.22)' : 'none',
        opacity: visible ? pop : 0,
        transform: `scale(${visible ? 0.7 + pop * 0.3 : 0.7}) rotate(${emphasized ? -1.5 : 0}deg)`,
      }}
    >
      {w.word}
    </span>
  );
}

export function HeadlineScene({ scene, words, sceneStartSec, sceneIndex }) {
  const s = scheme(scene.scheme ?? sceneIndex);
  const fontSize = headlineFontSize(words);
  const emphasis = new Set((scene.emphasis || []).map(clean));
  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          fontFamily: HEADLINE_FONT,
          fontSize,
          lineHeight: 1.25,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
        }}
      >
        {words.map((w, i) => (
          <KineticWord
            key={i}
            w={w}
            sceneStartSec={sceneStartSec}
            emphasized={emphasis.has(clean(w.word))}
            colors={s}
            fontSize={fontSize}
          />
        ))}
      </div>
    </SceneShell>
  );
}

// ---------- stat: icon + big number + small-caps label ----------

export function StatScene({ scene, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = scheme(scene.scheme ?? sceneIndex);
  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 160 }, durationInFrames: 20 });
  const labelIn = spring({ frame: frame - 8, fps, durationInFrames: 15 });
  const valueSize = scene.value && scene.value.length > 6 ? 190 : 250;
  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div style={{ textAlign: 'center' }}>
        {scene.icon ? (
          <div style={{ fontSize: 130, marginBottom: 30, transform: `scale(${pop})` }}>
            {scene.icon}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: HEADLINE_FONT,
            fontSize: valueSize,
            lineHeight: 1,
            color: s.ink,
            transform: `scale(${pop})`,
            textShadow: `9px 10px 0 ${s.accent}`,
          }}
        >
          {scene.value}
        </div>
        {scene.label ? (
          <div
            style={{
              fontFamily: LABEL_FONT,
              fontWeight: 800,
              fontSize: 46,
              letterSpacing: '0.18em',
              marginTop: 55,
              textTransform: 'uppercase',
              color: contrastOn(s.ink),
              backgroundColor: s.ink,
              display: 'inline-block',
              padding: '12px 30px',
              opacity: labelIn,
            }}
          >
            {scene.label}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
}

// ---------- card: cream paper card with tape ----------

export function Tape({ style }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: 170,
        height: 52,
        backgroundColor: 'rgba(240,235,215,0.75)',
        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
        ...style,
      }}
    />
  );
}

export function CardScene({ scene, words, sceneStartSec, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = scheme(scene.scheme ?? sceneIndex);
  const cardIn = spring({ frame, fps, config: { damping: 13, stiffness: 130 }, durationInFrames: 18 });
  const fontSize = Math.min(80, headlineFontSize(words));
  const emphasis = new Set((scene.emphasis || []).map(clean));
  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          position: 'relative',
          backgroundColor: CARD_BG,
          padding: '90px 70px',
          maxWidth: 880,
          transform: `rotate(-2deg) translateY(${(1 - cardIn) * 400}px)`,
          boxShadow: '14px 18px 0 rgba(0,0,0,0.28)',
          textAlign: 'center',
        }}
      >
        <Tape style={{ top: -24, left: -50, transform: 'rotate(-38deg)' }} />
        <Tape style={{ bottom: -22, right: -55, transform: 'rotate(-35deg)' }} />
        {scene.title ? (
          <div
            style={{
              fontFamily: LABEL_FONT,
              fontWeight: 800,
              fontSize: 38,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              backgroundColor: ORANGE,
              color: '#191919',
              display: 'inline-block',
              padding: '8px 22px',
              marginBottom: 40,
              transform: 'rotate(1.5deg)',
            }}
          >
            {scene.title}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: HEADLINE_FONT,
            fontSize,
            lineHeight: 1.3,
            color: '#191919',
            textTransform: 'uppercase',
          }}
        >
          {words.map((w, i) => (
            <KineticWord
              key={i}
              w={w}
              sceneStartSec={sceneStartSec}
              emphasized={emphasis.has(clean(w.word))}
              colors={{ ink: '#191919', accent: s.accent === '#191919' ? ORANGE : s.accent, bg: CARD_BG }}
              fontSize={fontSize}
            />
          ))}
        </div>
      </div>
    </SceneShell>
  );
}

// ---------- typewriter ----------

export function TypewriterScene({ scene, words, sceneStartSec, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = scheme(scene.scheme ?? sceneIndex);
  const t = frame / fps + sceneStartSec;

  let text = '';
  for (const w of words) {
    if (t >= w.end) {
      text += w.word + ' ';
    } else if (t > w.start) {
      const frac = (t - w.start) / Math.max(w.end - w.start, 0.05);
      text += w.word.slice(0, Math.ceil(frac * w.word.length));
      break;
    } else {
      break;
    }
  }
  const blink = Math.floor(frame / 12) % 2 === 0;
  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          fontFamily: TYPEWRITER_FONT,
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1.7,
          color: s.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          width: '100%',
        }}
      >
        {text}
        <span
          style={{
            display: 'inline-block',
            width: 34,
            height: 58,
            verticalAlign: 'middle',
            marginLeft: 6,
            backgroundColor: blink ? s.ink : 'transparent',
          }}
        />
      </div>
    </SceneShell>
  );
}

// ---------- photo: taped duotone archival photo ----------

// Exact port of the old hand-rolled Ken Burns (linear scale 1 → 1.07 across
// the scene), now resolved through the Motion Engine.
const KEN_BURNS_SPEC = Object.freeze({
  category: 'camera',
  kind: 'zoom',
  easing: 'linear',
  params: Object.freeze({ startScale: 1, endScale: 1.07, driftY: 0 }),
});

export function PhotoScene({ scene, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = scheme(scene.scheme ?? sceneIndex);
  const dropIn = spring({ frame, fps, config: { damping: 13, stiffness: 120 }, durationInFrames: 20 });
  const kenBurns = useCameraMotion(KEN_BURNS_SPEC).camera.scale;
  const rot = random(`photo-rot-${sceneIndex}`) * 4 - 2;
  const captionIn = spring({ frame: frame - 10, fps, durationInFrames: 15 });
  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          position: 'relative',
          transform: `rotate(${rot}deg) translateY(${(1 - dropIn) * -500}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: '#FBF8F0',
            padding: 26,
            boxShadow: '16px 20px 0 rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ width: 860, height: 1050, overflow: 'hidden' }}>
            {scene.src ? (
              <Img
                src={scene.src}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${kenBurns})`,
                  filter: 'grayscale(1) contrast(1.08) sepia(0.18) brightness(1.02)',
                }}
              />
            ) : null}
          </div>
        </div>
        <Tape style={{ top: -30, left: 90, transform: 'rotate(-6deg)' }} />
        <Tape style={{ top: -30, right: 90, transform: 'rotate(5deg)' }} />
        {scene.label ? (
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: -30,
              fontFamily: LABEL_FONT,
              fontWeight: 800,
              fontSize: 42,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              backgroundColor: ORANGE,
              color: '#191919',
              padding: '14px 30px',
              boxShadow: '6px 8px 0 rgba(0,0,0,0.25)',
              transform: `rotate(-2deg) scale(${captionIn})`,
            }}
          >
            {scene.label}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
}

// ---------- chart: animated line on a cream card ----------

export function ChartScene({ scene, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = scheme(scene.scheme ?? sceneIndex);
  const cardIn = spring({ frame, fps, config: { damping: 13, stiffness: 130 }, durationInFrames: 16 });
  const points = scene.points || [];
  const W = 900;
  const H = 620;
  const PAD = 90;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i) => PAD + (i / Math.max(points.length - 1, 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  // line reveals left-to-right over ~2 seconds
  const reveal = interpolate(frame, [8, 8 + fps * 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shown = Math.max(2, Math.ceil(points.length * reveal));
  const path = points
    .slice(0, shown)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ');

  return (
    <SceneShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          backgroundColor: CARD_BG,
          borderRadius: 28,
          padding: '60px 40px 30px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          transform: `translateY(${(1 - cardIn) * 500}px)`,
        }}
      >
        <div
          style={{
            fontFamily: LABEL_FONT,
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#191919',
            marginLeft: 40,
            marginBottom: 10,
          }}
        >
          {scene.title || ''}
        </div>
        <svg width={W} height={H}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD}
              x2={W - PAD}
              y1={H - PAD - f * (H - PAD * 2)}
              y2={H - PAD - f * (H - PAD * 2)}
              stroke="#19191922"
              strokeWidth={2}
            />
          ))}
          <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="#191919" strokeWidth={3} />
          <path d={path} fill="none" stroke={ORANGE} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          {points.slice(0, shown).map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={11} fill={CARD_BG} stroke={ORANGE} strokeWidth={7} />
          ))}
          {points.map((p, i) => (
            <text
              key={i}
              x={x(i)}
              y={H - PAD + 46}
              textAnchor="middle"
              fontFamily={LABEL_FONT}
              fontWeight={700}
              fontSize={26}
              fill="#191919"
            >
              {p.label}
            </text>
          ))}
          {shown >= points.length && points.length > 0 ? (
            <text
              x={x(points.length - 1)}
              y={y(points[points.length - 1].value) - 30}
              textAnchor="middle"
              fontFamily={HEADLINE_FONT}
              fontSize={40}
              fill="#191919"
            >
              {scene.value || ''}
            </text>
          ) : null}
        </svg>
      </div>
    </SceneShell>
  );
}
