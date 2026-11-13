export interface WallpaperResult {
  id: number;
  kind: WallpaperKind;
  provider: 'pexels' | 'commons';
  title: string;
  imageUrl: string;
  mediaUrl: string;
  pageUrl: string;
  photographer: string;
  photographerUrl: string;
  width: number;
  height: number;
  license?: string;
  licenseUrl?: string;
  durationSeconds?: number;
}

export type WallpaperKind = 'photo' | 'video';

export async function searchWallpapers(query: string, kind: WallpaperKind, signal?: AbortSignal): Promise<WallpaperResult[]> {
  const params = new URLSearchParams({ query: query.trim(), type: kind });
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Faça login para buscar papéis de parede.');
  const response = await fetch(`${API_BASE}/wallpapers?${params}`, {
    signal,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new Event('auth:logout'));
  if (!response.ok) throw new Error(data?.message ?? 'Não foi possível buscar wallpapers.');
  if (!Array.isArray(data)) throw new Error('A resposta da busca de wallpapers está inválida.');
  return data as WallpaperResult[];
}
import { API_BASE } from './api';
