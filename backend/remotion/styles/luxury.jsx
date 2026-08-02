import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Luxury minimal — charcoal / cream / gold, elegant serif, slow cinematic zooms.
export const LUX_SCHEMES = [
  { bg: '#F4EEE3', ink: '#221E18', accent: '#B8923E' }, // warm cream (default)
  { bg: '#16130E', ink: '#F4EEE3', accent: '#C9A24B' }, // deep charcoal
  { bg: '#C9A24B', ink: '#16130E', accent: '#F7F2E8' }, // gold panel
];

export const SERIF = "'Playfair Display', 'Didot', 'Palatino Linotype', Georgia, serif";
export const SANS = "'Segoe UI', 'Avenir', 'Helvetica Neue', sans-serif";

function luxScheme(index) {
  return LUX_SCHEMES[((index % LUX_SCHEMES.length) + LUX_SCHEMES.length) % LUX_SCHEMES.length];
}

function serifFontSize(text) {
  const chars = text.length;
  return Math.max(54, Math.min(112, Math.round(820 / Math.sqrt(chars + 1))));
}

function GoldRule({ color, width = 140, style }) {
  return <div style={{ width, height: 3, backgroundColor: color, margin: '0 auto', ...style }} />;
}

function LuxFrame({ accent }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 36,
        border: `2px solid ${accent}66`,
        pointerEvents: 'none',
      }}
    />
  );
}

export function LuxShell({ schemeIndex, children, zoom = true }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = luxScheme(schemeIndex);
  const scale = zoom ? interpolate(frame, [0, Math.max(durationInFrames, 1)], [1, 1.045]) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: s.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '170px 100px',
        }}
      >
        {children}
      </AbsoluteFill>
      <LuxFrame accent={s.accent} />
    </AbsoluteFill>
  );
}

// Per-word fade + rise, driven by the real word timestamps (calmer than Vox's spring pops).
function LuxWord({ w, sceneStartSec, emphasized, colors, fontSize }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = Math.max(0, Math.round((w.start - sceneStartSec) * fps) - 2);
  const t = interpolate(frame - appear, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <span
      style={{
        display: 'inline-block',
        margin: `${fontSize * 0.04}px ${fontSize * 0.1}px`,
        color: emphasized ? colors.accent : colors.ink,
        fontStyle: emphasized ? 'italic' : 'normal',
        opacity: t,
        transform: `translateY(${(1 - t) * 34}px)`,
      }}
    >
      {w.word}
    </span>
  );
}

const clean = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

export function LuxHeadlineScene({ scene, words, sceneStartSec, sceneIndex }) {
  const s = luxScheme(scene.scheme ?? sceneIndex);
  const text = words.map((w) => w.word).join(' ');
  const fontSize = serifFontSize(text);
  const emphasis = new Set((scene.emphasis || []).map(clean));
  return (
    <LuxShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div style={{ textAlign: 'center' }}>
        <GoldRule color={s.accent} style={{ marginBottom: 60 }} />
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize, lineHeight: 1.3 }}>
          {words.map((w, i) => (
            <LuxWord
              key={i}
              w={w}
              sceneStartSec={sceneStartSec}
              emphasized={emphasis.has(clean(w.word))}
              colors={s}
              fontSize={fontSize}
            />
          ))}
        </div>
        <GoldRule color={s.accent} style={{ marginTop: 60 }} />
      </div>
    </LuxShell>
  );
}

export function LuxStatScene({ scene, sceneIndex }) {
  const frame = useCurrentFrame();
  const s = luxScheme(scene.scheme ?? sceneIndex);
  const t = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' });
  const labelIn = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const valueSize = scene.value && scene.value.length > 6 ? 180 : 240;
  return (
    <LuxShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div style={{ textAlign: 'center', opacity: t, transform: `translateY(${(1 - t) * 50}px)` }}>
        <GoldRule color={s.accent} style={{ marginBottom: 70 }} />
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: valueSize, lineHeight: 1, color: s.ink }}>
          {scene.value}
        </div>
        {scene.label ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 38,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              marginTop: 65,
              color: s.accent,
              opacity: labelIn,
            }}
          >
            {scene.label}
          </div>
        ) : null}
        <GoldRule color={s.accent} style={{ marginTop: 70 }} />
      </div>
    </LuxShell>
  );
}

export function LuxCardScene({ scene, words, sceneStartSec, sceneIndex }) {
  const frame = useCurrentFrame();
  const s = luxScheme(scene.scheme ?? sceneIndex);
  const t = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const text = words.map((w) => w.word).join(' ');
  const fontSize = Math.min(76, serifFontSize(text));
  const emphasis = new Set((scene.emphasis || []).map(clean));
  return (
    <LuxShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          border: `2px solid ${s.accent}`,
          padding: '90px 75px',
          maxWidth: 880,
          textAlign: 'center',
          opacity: t,
          transform: `translateY(${(1 - t) * 60}px)`,
        }}
      >
        {scene.title ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 32,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: s.accent,
              marginBottom: 50,
            }}
          >
            {scene.title}
          </div>
        ) : null}
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontStyle: 'italic', fontSize, lineHeight: 1.4 }}>
          {words.map((w, i) => (
            <LuxWord
              key={i}
              w={w}
              sceneStartSec={sceneStartSec}
              emphasized={emphasis.has(clean(w.word))}
              colors={s}
              fontSize={fontSize}
            />
          ))}
        </div>
      </div>
    </LuxShell>
  );
}

export function LuxTypewriterScene({ scene, words, sceneStartSec, sceneIndex }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = luxScheme(scene.scheme ?? sceneIndex);
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
    <LuxShell schemeIndex={scene.scheme ?? sceneIndex}>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: 62,
          lineHeight: 1.7,
          color: s.ink,
          letterSpacing: '0.01em',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {text}
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 56,
            verticalAlign: 'middle',
            marginLeft: 8,
            backgroundColor: blink ? s.accent : 'transparent',
          }}
        />
      </div>
    </LuxShell>
  );
}

export function LuxScene(props) {
  switch (props.scene.type) {
    case 'stat':
      return <LuxStatScene {...props} />;
    case 'card':
      return <LuxCardScene {...props} />;
    case 'typewriter':
      return <LuxTypewriterScene {...props} />;
    default:
      return <LuxHeadlineScene {...props} />;
  }
}

export function LuxProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        height: 8,
        width: `${(frame / durationInFrames) * 100}%`,
        backgroundColor: '#C9A24B',
      }}
    />
  );
}

export function LuxWatermark({ branding }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 58,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        opacity: 0.9,
      }}
    >
      {branding.logoUrl ? <Img src={branding.logoUrl} style={{ height: 46 }} /> : null}
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 27,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: '#C9A24B',
          textShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      >
        {branding.name}
      </span>
    </div>
  );
}

function LuxContact({ branding, color }) {
  const items = [branding.phone, branding.instagram].filter(Boolean);
  if (!items.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        gap: 40,
        justifyContent: 'center',
        marginTop: 46,
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 34,
        letterSpacing: '0.06em',
        color,
        flexWrap: 'wrap',
      }}
    >
      {items.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

export function LuxCtaScene({ branding }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const s = luxScheme(1);
  return (
    <LuxShell schemeIndex={1}>
      <div style={{ textAlign: 'center', opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>
        {branding.logoUrl ? <Img src={branding.logoUrl} style={{ height: 230, marginBottom: 50 }} /> : null}
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 84, lineHeight: 1.15, color: s.ink }}>
          {branding.name}
        </div>
        <GoldRule color={s.accent} style={{ marginTop: 50, marginBottom: 50 }} />
        {branding.ctaLine ? (
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, color: s.ink, opacity: 0.9 }}>
            {branding.ctaLine}
          </div>
        ) : null}
        <LuxContact branding={branding} color={s.accent} />
      </div>
    </LuxShell>
  );
}

// ---------- static carousel slides ----------

function LuxSlideCounter({ index, total, color }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 28,
        letterSpacing: '0.3em',
        color,
        opacity: 0.7,
      }}
    >
      {index + 1} · {total}
    </div>
  );
}

function LuxBrandLine({ branding, color }) {
  if (!branding) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: '0.34em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {branding.name}
    </div>
  );
}

export function LuxSlide({ slide, index, total, branding }) {
  const heading = slide.heading || '';
  const body = slide.body || '';

  if (slide.role === 'cta') {
    const s = luxScheme(1);
    return (
      <LuxShell schemeIndex={1} zoom={false}>
        <div style={{ textAlign: 'center' }}>
          {branding?.logoUrl ? <Img src={branding.logoUrl} style={{ height: 210, marginBottom: 46 }} /> : null}
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 76, lineHeight: 1.15, color: s.ink }}>
            {branding?.name || heading}
          </div>
          <GoldRule color={s.accent} style={{ marginTop: 44, marginBottom: 44 }} />
          {heading ? (
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 44, color: s.ink, opacity: 0.95 }}>
              {heading}
            </div>
          ) : null}
          {branding?.ctaLine ? (
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, marginTop: 36, color: s.ink, opacity: 0.85 }}>
              {branding.ctaLine}
            </div>
          ) : null}
          {branding ? <LuxContact branding={branding} color={s.accent} /> : null}
        </div>
        <LuxSlideCounter index={index} total={total} color={s.accent} />
      </LuxShell>
    );
  }

  if (slide.role === 'hook') {
    const s = luxScheme(1);
    return (
      <LuxShell schemeIndex={1} zoom={false}>
        <LuxBrandLine branding={branding} color={s.accent} />
        <div style={{ textAlign: 'center' }}>
          <GoldRule color={s.accent} style={{ marginBottom: 56 }} />
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: serifFontSize(heading),
              lineHeight: 1.3,
              color: s.ink,
            }}
          >
            {heading}
          </div>
          <GoldRule color={s.accent} style={{ marginTop: 56 }} />
          {body ? (
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 38, marginTop: 56, color: s.ink, opacity: 0.85 }}>
              {body}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 110,
            right: 90,
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 38,
            color: s.accent,
          }}
        >
          {'Swipe →'}
        </div>
        <LuxSlideCounter index={index} total={total} color={s.accent} />
      </LuxShell>
    );
  }

  // content slide
  const s = luxScheme(0);
  return (
    <LuxShell schemeIndex={0} zoom={false}>
      <LuxBrandLine branding={branding} color={s.accent} />
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 92, color: s.accent, marginBottom: 26 }}>
          {String(index).padStart(2, '0')}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 64, lineHeight: 1.25, color: s.ink }}>
          {heading}
        </div>
        <GoldRule color={s.accent} style={{ marginTop: 44, marginBottom: 44, width: 100 }} />
        {body ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 41,
              lineHeight: 1.65,
              color: '#4A4336',
              maxWidth: 840,
              margin: '0 auto',
            }}
          >
            {body}
          </div>
        ) : null}
      </div>
      <LuxSlideCounter index={index} total={total} color={s.accent} />
    </LuxShell>
  );
}
