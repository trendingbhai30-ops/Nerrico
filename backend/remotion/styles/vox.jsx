import React from 'react';
import { Img, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  CardScene,
  ChartScene,
  HeadlineScene,
  PhotoScene,
  SceneShell,
  StatScene,
  Tape,
  TypewriterScene,
  headlineFontSize,
} from '../scenes.jsx';
import { CARD_BG, HEADLINE_FONT, LABEL_FONT, ORANGE } from '../theme.js';

export function VoxScene(props) {
  switch (props.scene.type) {
    case 'stat':
      return <StatScene {...props} />;
    case 'card':
      return <CardScene {...props} />;
    case 'photo':
      return <PhotoScene {...props} />;
    case 'chart':
      return <ChartScene {...props} />;
    case 'typewriter':
      return <TypewriterScene {...props} />;
    default:
      return <HeadlineScene {...props} />;
  }
}

export function VoxProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        height: 26,
        width: `${(frame / durationInFrames) * 100}%`,
        backgroundColor: ORANGE,
      }}
    />
  );
}

// Small paper tag pinned top-right through the whole video.
export function VoxWatermark({ branding }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        right: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        backgroundColor: CARD_BG,
        padding: '10px 20px',
        boxShadow: '5px 6px 0 rgba(0,0,0,0.22)',
        transform: 'rotate(2deg)',
      }}
    >
      {branding.logoUrl ? <Img src={branding.logoUrl} style={{ height: 44 }} /> : null}
      <span
        style={{
          fontFamily: LABEL_FONT,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#191919',
        }}
      >
        {branding.name}
      </span>
    </div>
  );
}

function ContactChips({ branding, fontSize = 34 }) {
  const chips = [branding.phone, branding.instagram].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 50, flexWrap: 'wrap' }}>
      {chips.map((c, i) => (
        <span
          key={i}
          style={{
            fontFamily: LABEL_FONT,
            fontWeight: 800,
            fontSize,
            letterSpacing: '0.08em',
            backgroundColor: '#191919',
            color: '#F0EBE1',
            padding: '12px 28px',
            transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// Branded end scene appended after the last content scene of a reel.
export function VoxCtaScene({ branding }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 13, stiffness: 130 }, durationInFrames: 18 });
  const lineIn = spring({ frame: frame - 8, fps, durationInFrames: 15 });
  return (
    <SceneShell schemeIndex={0}>
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - drop) * 400}px)` }}>
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            backgroundColor: CARD_BG,
            padding: '70px 80px',
            boxShadow: '14px 18px 0 rgba(0,0,0,0.28)',
            transform: 'rotate(-2deg)',
          }}
        >
          <Tape style={{ top: -24, left: -50, transform: 'rotate(-38deg)' }} />
          <Tape style={{ top: -24, right: -50, transform: 'rotate(35deg)' }} />
          {branding.logoUrl ? (
            <Img src={branding.logoUrl} style={{ height: 240, marginBottom: 40 }} />
          ) : null}
          <div
            style={{
              fontFamily: HEADLINE_FONT,
              fontSize: 74,
              lineHeight: 1.15,
              textTransform: 'uppercase',
              color: '#191919',
            }}
          >
            {branding.name}
          </div>
        </div>
        {branding.ctaLine ? (
          <div
            style={{
              fontFamily: LABEL_FONT,
              fontWeight: 800,
              fontSize: 42,
              marginTop: 60,
              color: '#191919',
              opacity: lineIn,
            }}
          >
            {branding.ctaLine}
          </div>
        ) : null}
        <div style={{ opacity: lineIn }}>
          <ContactChips branding={branding} />
        </div>
      </div>
    </SceneShell>
  );
}

// ---------- static carousel slides (rendered with renderStill — no animation) ----------

function SlideCounter({ index, total, ink }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 44,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: LABEL_FONT,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: '0.2em',
        color: ink,
        opacity: 0.6,
      }}
    >
      {index + 1} / {total}
    </div>
  );
}

function BrandChip({ branding }) {
  if (!branding) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: LABEL_FONT,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          backgroundColor: ORANGE,
          color: '#191919',
          padding: '8px 22px',
          transform: 'rotate(-1.5deg)',
          boxShadow: '4px 5px 0 rgba(0,0,0,0.2)',
        }}
      >
        {branding.name}
      </span>
    </div>
  );
}

export function VoxSlide({ slide, index, total, branding }) {
  const heading = slide.heading || '';
  const body = slide.body || '';

  if (slide.role === 'cta') {
    return (
      <SceneShell schemeIndex={0}>
        <BrandChip branding={branding} />
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              backgroundColor: CARD_BG,
              padding: '60px 70px',
              boxShadow: '14px 18px 0 rgba(0,0,0,0.28)',
              transform: 'rotate(-2deg)',
            }}
          >
            <Tape style={{ top: -24, left: -50, transform: 'rotate(-38deg)' }} />
            <Tape style={{ top: -24, right: -50, transform: 'rotate(35deg)' }} />
            {branding?.logoUrl ? <Img src={branding.logoUrl} style={{ height: 220, marginBottom: 36 }} /> : null}
            <div
              style={{
                fontFamily: HEADLINE_FONT,
                fontSize: 64,
                lineHeight: 1.15,
                textTransform: 'uppercase',
                color: '#191919',
              }}
            >
              {branding?.name || heading}
            </div>
          </div>
          {heading ? (
            <div style={{ fontFamily: LABEL_FONT, fontWeight: 800, fontSize: 44, marginTop: 56, color: '#191919' }}>
              {heading}
            </div>
          ) : null}
          {branding?.ctaLine ? (
            <div style={{ fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 36, marginTop: 30, color: '#191919' }}>
              {branding.ctaLine}
            </div>
          ) : null}
          {branding ? <ContactChips branding={branding} /> : null}
        </div>
        <SlideCounter index={index} total={total} ink="#191919" />
      </SceneShell>
    );
  }

  if (slide.role === 'hook') {
    const fontSize = headlineFontSize(heading.split(' ').map((word) => ({ word })));
    return (
      <SceneShell schemeIndex={1}>
        <BrandChip branding={branding} />
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: HEADLINE_FONT,
              fontSize,
              lineHeight: 1.25,
              textTransform: 'uppercase',
              color: '#F0EBE1',
              letterSpacing: '-0.01em',
            }}
          >
            {heading}
          </div>
          {body ? (
            <div
              style={{
                fontFamily: LABEL_FONT,
                fontWeight: 700,
                fontSize: 40,
                marginTop: 60,
                color: '#F0EBE1',
                opacity: 0.85,
              }}
            >
              {body}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 70,
            fontFamily: LABEL_FONT,
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            backgroundColor: ORANGE,
            color: '#191919',
            padding: '12px 28px',
            transform: 'rotate(-2deg)',
            boxShadow: '5px 6px 0 rgba(0,0,0,0.3)',
          }}
        >
          {'SWIPE →'}
        </div>
        <SlideCounter index={index} total={total} ink="#F0EBE1" />
      </SceneShell>
    );
  }

  // content slide
  return (
    <SceneShell schemeIndex={0}>
      <BrandChip branding={branding} />
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div
          style={{
            fontFamily: HEADLINE_FONT,
            fontSize: 96,
            color: ORANGE,
            textShadow: '6px 7px 0 rgba(0,0,0,0.2)',
            marginBottom: 30,
          }}
        >
          {String(index).padStart(2, '0')}
        </div>
        <div
          style={{
            fontFamily: HEADLINE_FONT,
            fontSize: 64,
            lineHeight: 1.25,
            textTransform: 'uppercase',
            color: '#191919',
            marginBottom: 50,
          }}
        >
          {heading}
        </div>
        {body ? (
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              backgroundColor: CARD_BG,
              padding: '50px 55px',
              maxWidth: 860,
              boxShadow: '12px 15px 0 rgba(0,0,0,0.25)',
              transform: 'rotate(-1.2deg)',
              fontFamily: LABEL_FONT,
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.5,
              color: '#191919',
              textAlign: 'left',
            }}
          >
            <Tape style={{ top: -26, left: 60, transform: 'rotate(-6deg)' }} />
            <Tape style={{ top: -26, right: 60, transform: 'rotate(5deg)' }} />
            {body}
          </div>
        ) : null}
      </div>
      <SlideCounter index={index} total={total} ink="#191919" />
    </SceneShell>
  );
}
