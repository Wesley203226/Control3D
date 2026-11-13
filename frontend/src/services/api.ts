import type { FilamentStock, Model, ModelInput, Print, PrintInput, Status, User } from '../types';
import type { FeatureMap } from '../types';

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
export const API_BASE = `${apiOrigin}/api`;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (import.meta.env.PROD && !apiOrigin) {
    throw new ApiError(
      0,
      'API_URL_NOT_CONFIGURED',
      'A API não está configurada. Defina VITE_API_URL com a URL pública do backend e publique novamente.',
    );
  }

  const token = localStorage.getItem('token');
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token expirado: força logout
    if (res.status === 401 && token) window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError(res.status, data?.error ?? 'ERROR', data?.message ?? 'Erro inesperado.', data?.details);
  }
  return data as T;
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  register: (d: { name: string; email: string; password: string }) => request<{ user: User }>('/auth/register', send('POST', d)),
  login: (d: { email: string; password: string }) => request<{ token: string; user: User }>('/auth/login', send('POST', d)),
  me: () => request<User>('/users/me'),
  features: () => request<{ features: FeatureMap }>('/features'),
  admin: {
    updateFeatures: (changes: Partial<FeatureMap>) => request<{ features: FeatureMap }>('/admin/features', send('PATCH', changes)),
  },

  models: {
    list: () => request<Model[]>('/models'),
    get: (id: number) => request<Model>(`/models/${id}`),
    create: (d: ModelInput) => request<Model>('/models', send('POST', d)),
    update: (id: number, d: ModelInput) => request<Model>(`/models/${id}`, send('PUT', d)),
    remove: (id: number) => request<void>(`/models/${id}`, send('DELETE')),
    prints: (id: number) => request<{ model: { id: number; name: string }; prints: Print[] }>(`/models/${id}/prints`),
  },

  prints: {
    list: (status?: Status | '') => request<Print[]>(`/prints${status ? `?status=${status}` : ''}`),
    get: (id: number) => request<Print>(`/prints/${id}`),
    create: (d: PrintInput) => request<Print>('/prints', send('POST', d)),
    update: (id: number, d: Partial<PrintInput>) => request<Print>(`/prints/${id}`, send('PUT', d)),
    remove: (id: number) => request<void>(`/prints/${id}`, send('DELETE')),
  },

  filaments: {
    listAll: () => request<FilamentStock[]>('/filaments'),
    list: (modelId: number) => request<FilamentStock[]>(`/models/${modelId}/filaments`),
    get: (id: number) => request<FilamentStock>(`/filaments/${id}`),
    create: (d: { modelId: number; material: string; color: string; spools: number; gramPerSpool: number; costPerGram?: number }) =>
      request<FilamentStock>('/filaments', send('POST', d)),
    update: (id: number, d: { material?: string; color?: string; spools?: number; gramPerSpool?: number; usedGrams?: number; costPerGram?: number }) =>
      request<FilamentStock>(`/filaments/${id}`, send('PATCH', d)),
    remove: (id: number) => request<void>(`/filaments/${id}`, send('DELETE')),
  },
};
