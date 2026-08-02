import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { LuxSlide } from './luxury.jsx';

// Cinematic documentary — designed, art-directed scenes rendered procedurally
// in Remotion ("Moon channel" reference look): vintage newspaper mockups,
// framed archival portraits on crumpled paper, red/peach sunburst collages,
// and photo scenes with floating serif captions. AI images are INGREDIENTS
// inside these compositions, not the whole frame. A woven fabric texture and
// film grain unify everything.

const INK = '#EDE6D6'; // bone white (text on dark)
const DARKINK = '#211A12'; // near-black ink (text on paper)
const ACCENT = '#D6483A'; // filmic red (on dark)
const PAPERRED = '#A31313'; // deep ink red (on paper)
const SERIF = "'Playfair Display', 'Didot', 'Palatino Linotype', Georgia, serif";
const DISPLAY = "'Haettenschweiler', 'Impact', 'Arial Narrow', sans-serif";

// ---------- camera ----------
function cameraTransform(camera, t, amp = 1) {
  // amp < 1 tones the move down for designed scenes (paper, newspaper).
  switch (camera) {
    case 'zoomOut':
      return { scale: 1 + (0.24 - 0.16 * t) * amp, x: 0, y: -8 * t * amp };
    case 'panLeft':
      return { scale: 1 + 0.18 * amp, x: (30 - 60 * t) * amp, y: 6 * t * amp };
    case 'panRight':
      return { scale: 1 + 0.18 * amp, x: (-30 + 60 * t) * amp, y: 6 * t * amp };
    case 'zoomIn':
    default:
      return { scale: 1 + (0.06 + 0.16 * t) * amp, x: 0, y: 10 * t * amp };
  }
}

function useShotCamera(scene, amp = 1) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, Math.max(durationInFrames, 1)], [0, 1], {
    easing: Easing.inOut(Easing.quad),
  });
  return cameraTransform(scene.camera, t, amp);
}

// Frame (within this shot) at which the shot-relative word index `rel` is spoken.
function useWordFrame(words, sceneStartSec) {
  const { fps } = useVideoConfig();
  return (rel) => {
    if (!words || !words.length) return 0;
    const w = words[Math.max(0, Math.min(Math.trunc(rel || 0), words.length - 1))];
    return Math.max(0, Math.round(((w.start ?? 0) - (sceneStartSec ?? 0)) * fps));
  };
}

// ---------- global overlays ----------
function Grain({ opacity = 0.1 }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={frame % 19} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

// Woven fabric / halftone texture over every scene — the reference's signature.
function Fabric({ dark = false }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: dark ? 0.5 : 0.55,
        backgroundImage: dark
          ? 'repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)'
          : 'repeating-linear-gradient(90deg, rgba(80,64,40,0.1) 0px, rgba(80,64,40,0.1) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(0deg, rgba(80,64,40,0.06) 0px, rgba(80,64,40,0.06) 1px, transparent 1px, transparent 3px)',
      }}
    />
  );
}

function PhotoGrade() {
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill style={{ backgroundColor: 'rgba(26,18,10,0.08)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
    </>
  );
}

// ---------- caption system (photo scenes) ----------
const clean = (w) => (w || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ']/g, '');

const CAPTION_POS = {
  tl: { left: 70, top: 190, textAlign: 'left' },
  tr: { right: 70, top: 190, textAlign: 'right' },
  ml: { left: 70, top: 620, textAlign: 'left' },
  mr: { right: 70, top: 620, textAlign: 'right' },
  bc: { left: 0, right: 0, bottom: 300, textAlign: 'center' },
};

function FloatingCaption({ text, emphasis = [], pos = 'bc', appearAt = 0, onPaper = false, underline = false }) {
  const frame = useCurrentFrame();
  const emph = new Set(emphasis.map(clean));
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const t = interpolate(frame, [appearAt + 2, appearAt + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const p = CAPTION_POS[pos] || CAPTION_POS.bc;
  const color = onPaper ? DARKINK : INK;
  const accent = onPaper ? PAPERRED : ACCENT;
  return (
    <div
      style={{
        position: 'absolute',
        ...p,
        maxWidth: pos === 'bc' ? undefined : 470,
        padding: pos === 'bc' ? '0 90px' : 0,
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: 58,
        lineHeight: 1.3,
        color,
        textShadow: onPaper ? 'none' : '0 4px 26px rgba(0,0,0,0.85)',
        opacity: t,
        transform: `translateY(${(1 - t) * 30}px)`,
        pointerEvents: 'none',
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ color: emph.has(clean(w)) ? accent : color, marginRight: 14 }}>
          {w}
        </span>
      ))}
      {underline ? (
        <div
          style={{
            width: 130,
            height: 3,
            backgroundColor: color,
            opacity: 0.75,
            margin: pos === 'bc' ? '14px auto 0' : '14px 0 0',
          }}
        />
      ) : null}
    </div>
  );
}

function EmojiAccent({ emoji, appearAt = 0 }) {
  const frame = useCurrentFrame();
  if (!emoji) return null;
  const t = interpolate(frame, [appearAt + 6, appearAt + 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.6)),
  });
  const bob = Math.sin(frame / 26) * 8;
  return (
    <div
      style={{
        position: 'absolute',
        left: 84,
        top: 430,
        fontSize: 130,
        opacity: t,
        transform: `scale(${0.5 + 0.5 * t}) translateY(${bob}px)`,
        filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.6))',
        pointerEvents: 'none',
      }}
    >
      {emoji}
    </div>
  );
}

// Procedural fallback when a photo shot has no image at all.
function ProceduralBackdrop() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 55) * 90;
  return (
    <AbsoluteFill style={{ backgroundColor: '#12100C' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 900px 1200px at calc(50% + ${drift}px) 42%, rgba(64,52,34,0.55) 0%, rgba(18,16,12,0) 65%)`,
        }}
      />
    </AbsoluteFill>
  );
}

function IconComposition({ icons }) {
  const frame = useCurrentFrame();
  const LAYOUTS = {
    1: [[50, 42, 380, 70]],
    2: [[36, 36, 300, 70], [66, 52, 230, 95]],
    3: [[30, 34, 260, 70], [68, 42, 220, 95], [48, 58, 190, 60]],
  };
  const layout = LAYOUTS[Math.min(icons.length, 3)] || LAYOUTS[1];
  const pop = interpolate(frame, [3, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 620px 780px at 50% 42%, rgba(214,72,58,0.16) 0%, rgba(237,230,214,0.07) 35%, rgba(0,0,0,0) 70%)',
        }}
      />
      {icons.map((icon, i) => {
        const [x, y, size, speed] = layout[i];
        const dx = Math.sin((frame + i * 40) / speed) * 14;
        const dy = Math.cos((frame + i * 40) / (speed * 1.3)) * 10;
        const delayed = Math.max(0, Math.min(1, pop - i * 0.12));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              fontSize: size,
              lineHeight: 1,
              transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${0.6 + 0.4 * delayed})`,
              opacity: delayed,
              filter: 'saturate(0.72) drop-shadow(0 30px 45px rgba(0,0,0,0.75))',
            }}
          >
            {icon}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ---------- kind: photo ----------
function PhotoScene({ scene, words, sceneStartSec }) {
  const cam = useShotCamera(scene, 1);
  const wordFrame = useWordFrame(words, sceneStartSec);
  const captions = scene.captions?.length
    ? scene.captions
    : scene.caption
      ? [{ text: scene.caption, emphasis: scene.emphasis || [], pos: 'bc', at: 0 }]
      : [];
  return (
    <>
      <AbsoluteFill style={{ transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)` }}>
        {scene.src ? (
          <Img src={scene.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <ProceduralBackdrop />
            {scene.icons?.length ? <IconComposition icons={scene.icons} /> : null}
          </>
        )}
      </AbsoluteFill>
      <PhotoGrade />
      {captions.map((c, i) => (
        <FloatingCaption
          key={i}
          text={c.text}
          emphasis={c.emphasis}
          pos={c.pos}
          appearAt={wordFrame(c.at)}
          underline={captions.length === 1 && (c.pos || 'bc') === 'bc' && !(c.emphasis || []).length}
        />
      ))}
      <EmojiAccent emoji={scene.accent} appearAt={wordFrame(captions[0]?.at || 0)} />
    </>
  );
}

// ---------- kind: newspaper ----------
// Deterministic pseudo-newsprint body copy so columns look typeset, not lorem-repeat.
const NEWS_WORDS =
  'the of and a to in is was for on that with as at by from city market plan report week state group new fund local price sale council board street value growth home land deal record year rate area project firm chief study rules court case bank share news public first last high open close major early result move offer term'.split(' ');
function fakeCopy(seed, count) {
  let x = seed * 2654435761 + 1013904223;
  const out = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1664525 + 1013904223) % 4294967296;
    out.push(NEWS_WORDS[x % NEWS_WORDS.length]);
  }
  let s = out.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

function WoodBackdrop() {
  return (
    <AbsoluteFill style={{ backgroundColor: '#241409' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <filter id="wood">
          <feTurbulence type="fractalNoise" baseFrequency="0.055 0.004" numOctaves="4" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.28  0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0.55 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#wood)" />
      </svg>
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)' }}
      />
    </AbsoluteFill>
  );
}

function NewsHeadline({ headline, accentWord }) {
  const target = clean(accentWord);
  const words = (headline || '').toUpperCase().split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize: 132,
        lineHeight: 0.98,
        letterSpacing: 1,
        color: DARKINK,
        margin: '18px 0 10px',
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ color: target && clean(w) === target ? PAPERRED : DARKINK, marginRight: 22 }}>
          {w}
        </span>
      ))}
    </div>
  );
}

function Newspaper({ scene, seed }) {
  return (
    <div
      style={{
        width: 860,
        backgroundColor: '#E7DBB8',
        backgroundImage:
          'radial-gradient(ellipse 300px 200px at 85% 90%, rgba(140,100,40,0.18) 0%, transparent 70%), radial-gradient(ellipse 260px 160px at 8% 30%, rgba(140,100,40,0.12) 0%, transparent 70%), linear-gradient(180deg, rgba(120,90,40,0.1) 0%, transparent 8%, transparent 92%, rgba(120,90,40,0.14) 100%)',
        padding: '42px 46px 54px',
        boxShadow: '0 45px 80px rgba(0,0,0,0.65), 0 10px 25px rgba(0,0,0,0.5)',
        borderRadius: 3,
      }}
    >
      {/* masthead */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: 54,
          letterSpacing: 3,
          color: DARKINK,
          borderBottom: `4px double ${DARKINK}`,
          paddingBottom: 10,
        }}
      >
        {scene.masthead || 'THE DAILY REPORT'}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: SERIF,
          fontSize: 17,
          color: '#4A3E28',
          borderBottom: `2px solid ${DARKINK}`,
          padding: '6px 4px',
        }}
      >
        <span>VOL. XLVII — No. {(seed * 37) % 90 + 10}</span>
        <span>LATE CITY EDITION</span>
        <span>25 CENTS</span>
      </div>
      <NewsHeadline headline={scene.headline} accentWord={scene.accentWord} />
      {scene.subhead ? (
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: '#3C321E', marginBottom: 16 }}>
          {scene.subhead}
        </div>
      ) : null}
      {/* columns + optional photo inset */}
      <div style={{ position: 'relative', borderTop: `2px solid ${DARKINK}`, paddingTop: 16 }}>
        <div
          style={{
            columnCount: 3,
            columnGap: 22,
            fontFamily: 'Georgia, serif',
            fontSize: 15.5,
            lineHeight: 1.42,
            textAlign: 'justify',
            color: '#33291A',
            opacity: 0.92,
            height: 560,
            overflow: 'hidden',
          }}
        >
          <b>{fakeCopy(seed + 1, 9)}</b> {fakeCopy(seed + 2, 150)} {fakeCopy(seed + 3, 130)}
        </div>
        {scene.src ? (
          <div
            style={{
              position: 'absolute',
              right: 10,
              top: 46,
              width: 340,
              padding: 8,
              backgroundColor: '#EFE5C6',
              border: '1px solid #7A6A45',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            }}
          >
            <Img
              src={scene.src}
              style={{ width: '100%', height: 260, objectFit: 'cover', filter: 'grayscale(1) contrast(1.1) sepia(0.22)' }}
            />
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#4A3E28', paddingTop: 6, fontStyle: 'italic' }}>
              {(scene.caption || scene.subhead || '').slice(0, 60)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewspaperScene({ scene, sceneIndex }) {
  const cam = useShotCamera(scene, 0.55);
  return (
    <>
      <WoodBackdrop />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`,
        }}
      >
        {/* paper underneath for the stacked look */}
        <div
          style={{
            position: 'absolute',
            width: 860,
            height: 900,
            backgroundColor: '#DECFA6',
            transform: 'rotate(4.5deg) translate(30px, 24px)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
            borderRadius: 3,
          }}
        />
        <div style={{ transform: 'rotate(-3.2deg)' }}>
          <Newspaper scene={scene} seed={sceneIndex + 3} />
        </div>
      </AbsoluteFill>
    </>
  );
}

// ---------- kind: framed ----------
function CrumpledPaper() {
  return (
    <AbsoluteFill style={{ backgroundColor: '#E9E2D0' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <filter id="crumple">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="4" seed="8" />
          <feDiffuseLighting lightingColor="#F4EDDC" surfaceScale="2.6" diffuseConstant="1.08">
            <feDistantLight azimuth="235" elevation="58" />
          </feDiffuseLighting>
        </filter>
        <rect width="100%" height="100%" filter="url(#crumple)" />
      </svg>
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 55%, rgba(60,48,28,0.28) 100%)' }}
      />
    </AbsoluteFill>
  );
}

function FramedScene({ scene, words, sceneStartSec }) {
  const cam = useShotCamera(scene, 0.5);
  const wordFrame = useWordFrame(words, sceneStartSec);
  const frame = useCurrentFrame();
  const settle = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <>
      <CrumpledPaper />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`,
        }}
      >
        <div style={{ transform: `translateY(${(1 - settle) * -26}px)`, opacity: settle, textAlign: 'center' }}>
          <div
            style={{
              padding: 26,
              background: 'linear-gradient(135deg, #8A6A1F 0%, #D9B45A 22%, #F3E09A 42%, #B98D2C 60%, #E8CC74 80%, #8A6A1F 100%)',
              boxShadow: '0 40px 70px rgba(50,38,18,0.55), inset 0 0 22px rgba(90,60,10,0.6)',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                padding: 10,
                background: 'linear-gradient(315deg, #7A5C18 0%, #C7A345 50%, #6E5214 100%)',
                boxShadow: 'inset 0 2px 8px rgba(255,240,190,0.6)',
              }}
            >
              {scene.src ? (
                <Img
                  src={scene.src}
                  style={{
                    display: 'block',
                    width: 640,
                    height: 800,
                    objectFit: 'cover',
                    filter: 'grayscale(1) contrast(1.08) sepia(0.18) brightness(1.02)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 640,
                    height: 800,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: 220,
                    backgroundColor: '#CFC5AC',
                  }}
                >
                  {scene.icons?.[0] || '🏛️'}
                </div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
      {/* caption sits under the frame, on the paper */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ marginBottom: 330 }}>
          <FramedCaption scene={scene} appearAt={wordFrame(0)} />
        </div>
      </AbsoluteFill>
    </>
  );
}

function FramedCaption({ scene, appearAt }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [appearAt + 4, appearAt + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  if (!scene.caption) return null;
  const emph = new Set((scene.emphasis || []).map(clean));
  return (
    <div
      style={{
        position: 'relative',
        top: 290,
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: 54,
        color: DARKINK,
        opacity: t,
        transform: `translateY(${(1 - t) * 24}px)`,
      }}
    >
      {scene.caption.split(/\s+/).map((w, i) => (
        <span key={i} style={{ color: emph.has(clean(w)) ? PAPERRED : DARKINK, marginRight: 13 }}>
          {w}
        </span>
      ))}
    </div>
  );
}

// ---------- kind: sunburst ----------
const BURSTS = {
  red: { base: '#7E0F0F', ray: 'rgba(190,40,30,0.5)', text: '#EFE3CE', shade: 'rgba(0,0,0,0.35)' },
  peach: { base: '#F0C4A0', ray: 'rgba(255,240,225,0.5)', text: '#191410', shade: 'rgba(120,70,30,0.18)' },
};

function SunburstScene({ scene, words, sceneStartSec }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const wordFrame = useWordFrame(words, sceneStartSec);
  const b = BURSTS[scene.burst] || BURSTS.red;
  const angle = frame * 0.12;
  const popTop = interpolate(frame, [2, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });
  const bottomAt = Math.max(wordFrame(Math.max((words?.length || 4) - 3, 0)), Math.round(durationInFrames * 0.3));
  const popBottom = interpolate(frame, [bottomAt, bottomAt + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });
  const centerIn = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const bigText = (txt) => ({
    fontFamily: DISPLAY,
    fontSize: 150,
    lineHeight: 0.96,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: b.text,
    textAlign: 'center',
    textShadow: scene.burst === 'peach' ? 'none' : '0 8px 30px rgba(0,0,0,0.45)',
  });
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: b.base }}>
        <AbsoluteFill
          style={{
            background: `repeating-conic-gradient(from ${angle}deg at 50% 40%, ${b.ray} 0deg 7deg, transparent 7deg 16deg)`,
          }}
        />
        <AbsoluteFill
          style={{ background: `radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 45%, ${b.shade} 100%)` }}
        />
      </AbsoluteFill>
      {/* top text */}
      {scene.topText ? (
        <div
          style={{
            position: 'absolute',
            top: 170,
            width: '100%',
            padding: '0 60px',
            opacity: popTop,
            transform: `scale(${0.86 + 0.14 * popTop})`,
            ...bigText(scene.topText),
          }}
        >
          {scene.topText.toUpperCase()}
        </div>
      ) : null}
      {/* center element */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        {scene.src ? (
          <div
            style={{
              opacity: centerIn,
              transform: `translateY(${(1 - centerIn) * 40}px) rotate(-2deg)`,
              padding: 0,
              boxShadow: '0 50px 90px rgba(0,0,0,0.55)',
            }}
          >
            <Img
              src={scene.src}
              style={{
                display: 'block',
                width: 660,
                height: 760,
                objectFit: 'cover',
                filter: 'grayscale(1) contrast(1.3) brightness(1.02)',
              }}
            />
          </div>
        ) : scene.centerEmoji ? (
          <div
            style={{
              fontSize: 330,
              opacity: centerIn,
              transform: `scale(${0.6 + 0.4 * centerIn})`,
              filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5))',
            }}
          >
            {scene.centerEmoji}
          </div>
        ) : null}
      </AbsoluteFill>
      {/* bottom text */}
      {scene.bottomText ? (
        <div
          style={{
            position: 'absolute',
            bottom: 210,
            width: '100%',
            padding: '0 60px',
            opacity: popBottom,
            transform: `translateY(${(1 - popBottom) * 40}px)`,
            ...bigText(scene.bottomText),
          }}
        >
          {scene.bottomText.toUpperCase()}
        </div>
      ) : null}
    </>
  );
}

// ---------- dispatcher ----------
export function CinScene({ scene, words, sceneStartSec, sceneIndex }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
  const kind = scene.kind || 'photo';
  const isPaper = kind === 'framed' || (kind === 'sunburst' && scene.burst === 'peach');
  let body;
  if (kind === 'newspaper') body = <NewspaperScene scene={scene} sceneIndex={sceneIndex || 0} />;
  else if (kind === 'framed') body = <FramedScene scene={scene} words={words} sceneStartSec={sceneStartSec} />;
  else if (kind === 'sunburst') body = <SunburstScene scene={scene} words={words} sceneStartSec={sceneStartSec} />;
  else body = <PhotoScene scene={scene} words={words} sceneStartSec={sceneStartSec} />;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        {body}
        <Fabric dark={!isPaper && kind !== 'newspaper'} />
        <Grain opacity={isPaper ? 0.07 : 0.1} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function CinProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        height: 7,
        width: `${(frame / Math.max(durationInFrames - 1, 1)) * 100}%`,
        backgroundColor: ACCENT,
      }}
    />
  );
}

export function CinWatermark({ branding }) {
  if (!branding) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 54,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        opacity: 0.9,
      }}
    >
      {branding.logoUrl ? (
        <Img src={branding.logoUrl} style={{ height: 44, borderRadius: 6 }} />
      ) : null}
      <span
        style={{
          fontFamily: SERIF,
          fontSize: 26,
          letterSpacing: 8,
          color: INK,
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          textTransform: 'uppercase',
        }}
      >
        {branding.name}
      </span>
    </div>
  );
}

export function CinCtaScene({ branding }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill
      style={{ backgroundColor: '#0D0B08', justifyContent: 'center', alignItems: 'center', gap: 36 }}
    >
      <div style={{ textAlign: 'center', opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
        {branding.logoUrl ? (
          <Img src={branding.logoUrl} style={{ height: 210, borderRadius: 12, marginBottom: 44 }} />
        ) : null}
        <div style={{ fontFamily: SERIF, fontSize: 74, fontWeight: 600, color: INK }}>{branding.name}</div>
        {branding.ctaLine ? (
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: `${INK}CC`, marginTop: 26, maxWidth: 800 }}>
            {branding.ctaLine}
          </div>
        ) : null}
      </div>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
}

// Carousels keep the luxury slide design for now (MVP: cinematic is reels-only).
export const CinSlide = LuxSlide;
