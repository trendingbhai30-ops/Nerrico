/** Top-level views of the single-page app (no router yet — state-driven). */
export type ViewMode = 'dashboard' | 'new-video' | 'project-detail' | 'settings';

/** Views reachable from the navbar (project-detail needs a selected project). */
export type NavTarget = Exclude<ViewMode, 'project-detail'>;
