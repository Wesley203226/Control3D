const SPOTIFY_CONTENT_TYPES = new Set(['track', 'album', 'playlist', 'artist', 'episode', 'show']);

export function getSpotifyEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.username || url.password) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    const typeIndex = segments.findIndex((segment) => SPOTIFY_CONTENT_TYPES.has(segment));
    if (typeIndex < 0 || !segments[typeIndex + 1] || !/^[\da-z]+$/i.test(segments[typeIndex + 1])) return null;
    return `https://open.spotify.com/embed/${segments[typeIndex]}/${segments[typeIndex + 1]}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export function normalizeSpotifyUrl(value: string): string | null {
  const embedUrl = getSpotifyEmbedUrl(value);
  if (!embedUrl) return null;
  const url = new URL(embedUrl);
  return `https://open.spotify.com/${url.pathname.replace('/embed/', '')}`;
}
