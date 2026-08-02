import { buildApiUrl } from '../config/api';
import { getErrorMessage } from '../utils/errors';
import type {
  HealthResponse,
  VoicesListResponse,
  ProjectsListResponse,
  OptionsResponse,
  Project,
  CreateProjectPayload,
  CreateProjectResponse,
  ActionSuccessResponse,
} from '../types/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ErrorHandler = (error: string) => void;

let globalErrorHandler: ErrorHandler | null = null;

/** Register a handler (e.g. a toast) that every failed request reports to. */
export function setGlobalErrorHandler(handler: ErrorHandler) {
  globalErrorHandler = handler;
}

interface ErrorBody {
  error?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    let data: unknown = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const errorMessage =
        (data as ErrorBody | null)?.error || `HTTP error ${res.status}: ${res.statusText}`;
      if (globalErrorHandler) {
        globalErrorHandler(errorMessage);
      }
      throw new ApiError(errorMessage, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = getErrorMessage(err, 'Network error connecting to Nerrico backend');
    if (globalErrorHandler && !path.includes('/api/health')) {
      globalErrorHandler(message);
    }
    throw new ApiError(message, 0);
  }
}

export const api = {
  // Health
  checkHealth: (): Promise<HealthResponse> => request<HealthResponse>('/api/health'),

  // Option lists (modes / languages / styles / formats)
  getOptions: (): Promise<OptionsResponse> => request<OptionsResponse>('/api/options'),

  // Voices
  getVoices: (): Promise<VoicesListResponse> => request<VoicesListResponse>('/api/voices'),

  // Projects
  getProjects: (): Promise<ProjectsListResponse> => request<ProjectsListResponse>('/api/projects'),
  getProject: (id: string): Promise<Project> => request<Project>(`/api/projects/${id}`),
  createProject: (payload: CreateProjectPayload): Promise<CreateProjectResponse> =>
    request<CreateProjectResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProject: (id: string): Promise<void> =>
    request<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),

  // Pipeline Actions
  generateScript: (id: string): Promise<ActionSuccessResponse> =>
    request<ActionSuccessResponse>(`/api/projects/${id}/script/generate`, {
      method: 'POST',
    }),
  updateScript: (id: string, script: string): Promise<ActionSuccessResponse> =>
    request<ActionSuccessResponse>(`/api/projects/${id}/script`, {
      method: 'PUT',
      body: JSON.stringify({ script }),
    }),
  approveProject: (id: string): Promise<ActionSuccessResponse> =>
    request<ActionSuccessResponse>(`/api/projects/${id}/approve`, {
      method: 'POST',
    }),
  retryProject: (id: string): Promise<ActionSuccessResponse> =>
    request<ActionSuccessResponse>(`/api/projects/${id}/retry`, {
      method: 'POST',
    }),

  // Media URL Helper
  getMediaUrl: (path: string | null | undefined): string | null => {
    if (!path) return null;
    return buildApiUrl(path);
  },
};
