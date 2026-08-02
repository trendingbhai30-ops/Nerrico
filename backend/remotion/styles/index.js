// Visual style registry (Remotion side). Adding a style = one module + one entry here.
// The backend-side twin (allowed scene types, prompt text) lives in lib/styles.js.
import { VoxCtaScene, VoxProgressBar, VoxScene, VoxSlide, VoxWatermark } from './vox.jsx';
import { LuxCtaScene, LuxProgressBar, LuxScene, LuxSlide, LuxWatermark } from './luxury.jsx';
import { CinCtaScene, CinProgressBar, CinScene, CinSlide, CinWatermark } from './cinematic.jsx';

export const STYLES = {
  vox: {
    Scene: VoxScene,
    ProgressBar: VoxProgressBar,
    Watermark: VoxWatermark,
    CtaScene: VoxCtaScene,
    Slide: VoxSlide,
  },
  luxury: {
    Scene: LuxScene,
    ProgressBar: LuxProgressBar,
    Watermark: LuxWatermark,
    CtaScene: LuxCtaScene,
    Slide: LuxSlide,
  },
  cinematic: {
    Scene: CinScene,
    ProgressBar: CinProgressBar,
    Watermark: CinWatermark,
    CtaScene: CinCtaScene,
    Slide: CinSlide,
  },
};

export function getStyle(id) {
  return STYLES[id] || STYLES.vox;
}
