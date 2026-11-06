import type {
  NavEntrySpec,
  PluginSpec,
  ValidationIssue,
} from '../core/index';

export interface ProjectSummary {
  key: string;
  name: string;
  version: string;
  updatedAt: string;
}

export interface Project {
  key: string;
  tenant: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface GenerateResult {
  files: string[];
  artifacts: { api: boolean; dbsetup: boolean; combined: boolean };
  warnings: ValidationIssue[];
  navBaseline: NavEntrySpec[];
}

export interface ValidateResult {
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string; details?: unknown[] };
    };
    throw new ApiError(
      response.status,
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? response.statusText,
      body.error?.details ?? [],
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listProjects: () =>
    request<{ projects: ProjectSummary[] }>('/api/projects'),
  createProject: (input: {
    key?: string;
    name: string;
    publisher?: { name: string; email: string };
  }) =>
    request<{ project: Project; spec: PluginSpec }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getProject: (key: string) =>
    request<{
      project: Project;
      spec: PluginSpec;
      navBaseline: NavEntrySpec[] | null;
    }>(`/api/projects/${encodeURIComponent(key)}`),
  deleteProject: (key: string) =>
    request<void>(`/api/projects/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),
  putSpec: (key: string, spec: PluginSpec, revision: number) =>
    request<{ revision: number; updatedAt: string }>(
      `/api/projects/${encodeURIComponent(key)}/spec`,
      {
        method: 'PUT',
        body: JSON.stringify({ spec, revision }),
      },
    ),
  validate: (key: string) =>
    request<ValidateResult>(
      `/api/projects/${encodeURIComponent(key)}/validate`,
      { method: 'POST', body: '{}' },
    ),
  generate: (key: string) =>
    request<GenerateResult>(
      `/api/projects/${encodeURIComponent(key)}/generate`,
      { method: 'POST', body: '{}' },
    ),
  listFiles: (key: string) =>
    request<{ files: Array<{ path: string; size: number; updatedAt: string }> }>(
      `/api/projects/${encodeURIComponent(key)}/files`,
    ),
  uploadFile: async (key: string, file: File, path: string) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(
      `/api/projects/${encodeURIComponent(key)}/files?path=${encodeURIComponent(path)}`,
      { method: 'PUT', body: form },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string; details?: unknown[] };
      };
      throw new ApiError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? response.statusText,
        body.error?.details ?? [],
      );
    }
    return (await response.json()) as {
      file: { path: string; size: number; updatedAt: string };
    };
  },
  deleteFile: (key: string, path: string) =>
    request<void>(
      `/api/projects/${encodeURIComponent(key)}/files?path=${encodeURIComponent(path)}`,
      { method: 'DELETE' },
    ),
  downloadUrl: (key: string, artifact: 'api' | 'dbsetup' | 'combined') =>
    `/api/projects/${encodeURIComponent(key)}/download/${artifact}`,
};
