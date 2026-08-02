const STORAGE_KEY = 'nerrico_api_base_url';

// Precedence: user's Settings page (localStorage) > VITE_API_BASE_URL (.env) > default.
export const DEFAULT_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ||
  'http://localhost:4000';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_API_BASE_URL;
  // Clean trailing slashes
  return stored.trim().replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, cleaned);
  }
}

export function buildApiUrl(path: string): string {
  if (!path) return getApiBaseUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
