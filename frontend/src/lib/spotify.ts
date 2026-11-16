const SPOTIFY_CONTENT_TYPES = new Set(['track', 'album', 'playlist', 'artist', 'episode', 'show']);

function createEmbedUrl(type: string, id: string): string | null {
  if (!SPOTIFY_CONTENT_TYPES.has(type) || !/^[\da-z]+$/i.test(id)) return null;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

export function getSpotifyEmbedUrl(value: string): string | null {
  const spotifyUri = value.trim().match(/^spotify:(track|album|playlist|artist|episode|show):([\da-z]+)$/i);
  if (spotifyUri) return createEmbedUrl(spotifyUri[1].toLowerCase(), spotifyUri[2]);
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.username || url.password) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    const typeIndex = segments.findIndex((segment) => SPOTIFY_CONTENT_TYPES.has(segment));
    if (typeIndex < 0 || !segments[typeIndex + 1]) return null;
    return createEmbedUrl(segments[typeIndex], segments[typeIndex + 1]);
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
