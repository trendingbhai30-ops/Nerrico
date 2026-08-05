import React from 'react';
import { Audio, Sequence, useVideoConfig } from 'remotion';

// Asset Engine audio layer (Phase 4C).
//
// Plays the provider-built asset timeline: `assets.music` + `assets.sfx`,
// each entry a render-ready object ({src, start, end, volume, loop, fadeIn,
// fadeOut, enabled, priority, ...}). This component consumes ONLY those
// fields — it knows nothing about the registry, semantic ids or the
// filesystem, and it renders nothing visual (assets.icons is data for future
// compositions, deliberately not drawn here).
//
// `end: null` = the natural end: the video end for looping beds, the clip's
// own length for one-shots (the provider pre-fills SFX ends, so null here in
// practice means "music until the credits").

/** Per-frame volume with linear fade in/out; plain number when no fades. */
function trackVolume(track, durationInFrames, fps) {
  const base = typeof track.volume === 'number' ? track.volume : 1;
  const fadeInF = Math.round((track.fadeIn || 0) * fps);
  const fadeOutF = Math.round((track.fadeOut || 0) * fps);
  if (fadeInF <= 0 && fadeOutF <= 0) return base;
  return (f) => {
    let gain = 1;
    if (fadeInF > 0) gain = Math.min(gain, f / fadeInF);
    if (fadeOutF > 0) gain = Math.min(gain, (durationInFrames - 1 - f) / fadeOutF);
    return base * Math.max(0, Math.min(1, gain));
  };
}

function AssetTrack({ track }) {
  const { fps, durationInFrames } = useVideoConfig();
  const from = Math.max(0, Math.round((track.start || 0) * fps));
  const endF = track.end == null ? durationInFrames : Math.round(track.end * fps);
  const durF = Math.min(endF, durationInFrames) - from;
  if (durF <= 0 || from >= durationInFrames) return null;
  return (
    <Sequence from={from} durationInFrames={durF}>
      <Audio src={track.src} loop={Boolean(track.loop)} volume={trackVolume(track, durF, fps)} />
    </Sequence>
  );
}

export function AssetAudioLayer({ assets }) {
  if (!assets) return null;
  const tracks = [...(assets.music || []), ...(assets.sfx || [])].filter(
    (t) => t && t.src && t.enabled !== false
  );
  if (!tracks.length) return null;
  return (
    <>
      {tracks.map((t, i) => (
        <AssetTrack key={`${t.assetId || t.src}-${i}`} track={t} />
      ))}
    </>
  );
}
