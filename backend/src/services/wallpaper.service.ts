import { AppError } from '../lib/errors';

const PEXELS_API = 'https://api.pexels.com';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_COMMONS_VIDEO_BYTES = 60 * 1024 * 1024;

export type WallpaperKind = 'photo' | 'video';
export type WallpaperProvider = 'pexels' | 'commons';

export interface WallpaperResult {
  id: number;
  kind: WallpaperKind;
  provider: WallpaperProvider;
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

interface CachedResult {
  expiresAt: number;
  results: WallpaperResult[];
}

interface PexelsPhoto {
  id: number;
  alt?: string | null;
  photographer: string;
  photographer_url: string;
  url: string;
  width: number;
  height: number;
  src: { large2x?: string; large?: string; medium?: string };
}

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  user: { name: string; url: string };
  video_files: Array<{ link: string; width: number; height: number; quality: string; file_type: string }>;
}

interface CommonsMetadataValue {
  value?: string;
}

interface CommonsPage {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    descriptionurl: string;
    width: number;
    height: number;
    size: number;
    duration?: number;
    extmetadata?: {
      ObjectName?: CommonsMetadataValue;
      Artist?: CommonsMetadataValue;
      Attribution?: CommonsMetadataValue;
      LicenseShortName?: CommonsMetadataValue;
      LicenseUrl?: CommonsMetadataValue;
    };
  }>;
}

const cache = new Map<string, CachedResult>();

function isPexelsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'images.pexels.com' || url.hostname === 'videos.pexels.com');
  } catch {
    return false;
  }
}

function landscapeSize(width: number, height: number) {
  return width >= 480 && height >= 270 && width >= height;
}

function isWikimediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['thumb.wikimedia.org', 'upload.wikimedia.org'].includes(url.hostname);
  } catch {
    return false;
  }
}

function plainText(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || fallback;
}

function fromPhoto(photo: PexelsPhoto): WallpaperResult | null {
  const imageUrl = [photo.src.large2x, photo.src.large, photo.src.medium].find((url) => url && isPexelsUrl(url));
  if (!imageUrl || !landscapeSize(photo.width, photo.height) || !photo.photographer_url.startsWith('https://')) return null;
  return {
    id: photo.id,
    kind: 'photo',
    provider: 'pexels',
    title: photo.alt?.trim().slice(0, 180) || `Foto de ${photo.photographer}`,
    imageUrl,
    mediaUrl: imageUrl,
    pageUrl: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
  };
}

function fromVideo(video: PexelsVideo): WallpaperResult | null {
  const selected = video.video_files
    .filter((file) => file.file_type === 'video/mp4' && isPexelsUrl(file.link) && landscapeSize(file.width, file.height))
    .sort((left, right) => {
      const leftDistance = Math.abs(left.width - 1280);
      const rightDistance = Math.abs(right.width - 1280);
      return leftDistance - rightDistance;
    })[0];
  if (!selected || !isPexelsUrl(video.image) || !video.url.startsWith('https://') || !video.user.url.startsWith('https://')) return null;
  return {
    id: video.id,
    kind: 'video',
    provider: 'pexels',
    title: `Vídeo de ${video.user.name}`,
    imageUrl: video.image,
    mediaUrl: selected.link,
    pageUrl: video.url,
    photographer: video.user.name,
    photographerUrl: video.user.url,
    width: selected.width,
    height: selected.height,
    durationSeconds: video.duration,
  };
}

async function searchPexels(query: string, kind: WallpaperKind, apiKey: string): Promise<WallpaperResult[]> {
  const endpoint = kind === 'photo' ? '/v1/search' : '/videos/search';
  const params = new URLSearchParams({
    query,
    orientation: 'landscape',
    size: kind === 'photo' ? 'large' : 'medium',
    per_page: '24',
  });

  let response: Response;
  try {
    response = await fetch(`${PEXELS_API}${endpoint}?${params}`, {
      headers: { Authorization: apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AppError(502, 'WALLPAPER_PROVIDER_UNAVAILABLE', 'A Pexels não respondeu à busca.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new AppError(503, 'WALLPAPER_SEARCH_UNAVAILABLE', 'A chave Pexels é inválida ou não tem permissão para buscar wallpapers.');
  }
  if (!response.ok) throw new AppError(response.status === 429 ? 429 : 502, response.status === 429 ? 'WALLPAPER_RATE_LIMITED' : 'WALLPAPER_PROVIDER_ERROR', 'A Pexels não conseguiu concluir a busca.');

  const data = await response.json() as { photos?: PexelsPhoto[]; videos?: PexelsVideo[] };
  return kind === 'photo'
    ? (data.photos ?? []).map(fromPhoto).filter((item): item is WallpaperResult => item !== null)
    : (data.videos ?? []).map(fromVideo).filter((item): item is WallpaperResult => item !== null);
}

function fromCommonsPage(page: CommonsPage, kind: WallpaperKind): WallpaperResult | null {
  const image = page.imageinfo?.[0];
  if (!image || !isWikimediaUrl(image.url) || !image.descriptionurl.startsWith('https://commons.wikimedia.org/')) return null;
  if (!landscapeSize(image.width, image.height)) return null;
  const metadata = image.extmetadata;
  const license = plainText(metadata?.LicenseShortName?.value, '');
  if (!license) return null;

  if (kind === 'photo') {
    const imageUrl = image.thumburl && isWikimediaUrl(image.thumburl) ? image.thumburl : image.url;
    if (!/\.(jpe?g|png|webp|avif)$/i.test(new URL(imageUrl).pathname)) return null;
    return {
      id: page.pageid,
      kind,
      provider: 'commons',
      title: plainText(metadata?.ObjectName?.value, page.title.replace(/^File:/, '')),
      imageUrl,
      mediaUrl: imageUrl,
      pageUrl: image.descriptionurl,
      photographer: plainText(metadata?.Artist?.value ?? metadata?.Attribution?.value, 'Autor na página do arquivo'),
      photographerUrl: image.descriptionurl,
      width: image.width,
      height: image.height,
      license,
      ...(metadata?.LicenseUrl?.value?.startsWith('https://') ? { licenseUrl: metadata.LicenseUrl.value } : {}),
    };
  }

  if (!/\.(webm|mp4)$/i.test(new URL(image.url).pathname) ||
      !Number.isFinite(image.size) ||
      image.size > MAX_COMMONS_VIDEO_BYTES ||
      !image.thumburl ||
      !isWikimediaUrl(image.thumburl) ||
      !image.duration) return null;
  return {
    id: page.pageid,
    kind,
    provider: 'commons',
    title: plainText(metadata?.ObjectName?.value, page.title.replace(/^File:/, '')),
    imageUrl: image.thumburl,
    mediaUrl: image.url,
    pageUrl: image.descriptionurl,
    photographer: plainText(metadata?.Artist?.value ?? metadata?.Attribution?.value, 'Autor na página do arquivo'),
    photographerUrl: image.descriptionurl,
    width: image.width,
    height: image.height,
    license,
    ...(metadata?.LicenseUrl?.value?.startsWith('https://') ? { licenseUrl: metadata.LicenseUrl.value } : {}),
    durationSeconds: image.duration,
  };
}

async function searchCommons(query: string, kind: WallpaperKind): Promise<WallpaperResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:${kind === 'photo' ? 'bitmap' : 'video'} ${query}`,
    gsrnamespace: '6',
    gsrlimit: '40',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1440',
    format: 'json',
    formatversion: '2',
  });
  let response: Response;
  try {
    response = await fetch(`${WIKIMEDIA_API}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new AppError(502, 'WALLPAPER_PROVIDER_UNAVAILABLE', 'A busca alternativa de wallpapers não respondeu. Tente novamente.');
  }
  if (!response.ok) throw new AppError(502, 'WALLPAPER_PROVIDER_ERROR', 'A busca alternativa de wallpapers não conseguiu concluir a pesquisa.');

  let data: { query?: { pages?: CommonsPage[] }; errors?: Array<{ code?: string }> };
  try {
    data = await response.json() as typeof data;
  } catch {
    throw new AppError(502, 'WALLPAPER_PROVIDER_ERROR', 'A busca alternativa de wallpapers retornou uma resposta inválida.');
  }
  if (data.errors?.length) throw new AppError(502, 'WALLPAPER_PROVIDER_ERROR', 'A busca alternativa de wallpapers não conseguiu concluir a pesquisa.');
  return (data.query?.pages ?? [])
    .map((page) => fromCommonsPage(page, kind))
    .filter((item): item is WallpaperResult => item !== null);
}

export async function searchWallpapers(query: string, kind: WallpaperKind): Promise<WallpaperResult[]> {
  const key = `${kind}:${query.toLocaleLowerCase('pt-BR')}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  cache.delete(key);

  const apiKey = process.env.PEXELS_API_KEY?.trim();
  let results: WallpaperResult[];
  if (apiKey) {
    try {
      results = await searchPexels(query, kind, apiKey);
    } catch {
      console.warn('Pexels indisponível; usando busca alternativa no Wikimedia Commons.');
      results = [];
    }
    if (!results.length) results = await searchCommons(query, kind);
  } else {
    results = await searchCommons(query, kind);
  }
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  return results;
}
