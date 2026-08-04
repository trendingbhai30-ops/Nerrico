// Types mirroring the backend API contract (backend/src/api/routes/*).

export type ProjectStatus =
  | 'created'
  | 'scripting'
  | 'script_ready'
  | 'voicing'
  | 'planning_scenes'
  | 'rendering'
  | 'done'
  | 'failed';

export type ContentModeId = 'normal' | 'realestate';
export type Language = 'english' | 'hinglish' | 'hindi';
export type StyleId = 'vox' | 'luxury' | 'cinematic';
/** Style Bible look ids — populate pickers from /api/options → visualStyles, do not hardcode. */
export type VisualStyleId = string;
export type ProjectFormat = 'reel' | 'carousel';
export type SlideRole = 'hook' | 'content' | 'cta';

export interface ProgressInfo {
  step: string;
  percent: number;
}

export interface Slide {
  role: SlideRole;
  heading: string;
  body: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  research?: string;
  voiceId?: string | null;
  mode?: ContentModeId;
  language?: Language;
  style?: StyleId;
  visualStyle?: VisualStyleId;
  format?: ProjectFormat;
  script?: string | null;
  slides?: Slide[] | null;
  error?: string | null;
  progress?: ProgressInfo;
  videoUrl?: string | null;
  slideUrls?: string[] | null;
  zipUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | string;
  accent: string;
  sampleUrl: string;
}

export interface ContentModeOption {
  id: ContentModeId;
  name: string;
  description: string;
  researchOptional: boolean;
}

export interface StyleOption {
  id: StyleId;
  name: string;
  description: string;
}

export interface VisualStyleOption {
  id: VisualStyleId;
  name: string;
  description: string;
  /** The render style this look belongs to — filter the picker by the selected style. */
  renderStyle: StyleId;
}

export interface OptionsResponse {
  modes: ContentModeOption[];
  languages: Language[];
  styles: StyleOption[];
  visualStyles: VisualStyleOption[];
  formats: ProjectFormat[];
}

export interface HealthResponse {
  ok: boolean;
  version: string;
}

export interface ProjectsListResponse {
  projects: Project[];
}

export interface VoicesListResponse {
  voices: Voice[];
}

export interface CreateProjectPayload {
  title: string;
  research: string;
  voiceId: string;
  mode?: ContentModeId;
  language?: Language;
  style?: StyleId;
  visualStyle?: VisualStyleId;
  format?: ProjectFormat;
}

export interface CreateProjectResponse {
  id: string;
}

export interface ActionSuccessResponse {
  ok: boolean;
}
