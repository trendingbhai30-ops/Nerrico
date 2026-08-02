import React from 'react';
import { getStyle } from './styles/index.js';

// One static carousel slide (1080x1350), rendered with renderStill at frame 0 —
// slide components must not rely on animation.
export function Slide({ slide, index, total, style, branding }) {
  const S = getStyle(style);
  return <S.Slide slide={slide} index={index} total={total} branding={branding} />;
}
