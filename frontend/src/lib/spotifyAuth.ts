const ACCESS_TOKEN_KEY = 'spotify-access-token';
const REFRESH_TOKEN_KEY = 'spotify-refresh-token';
const EXPIRES_AT_KEY = 'spotify-expires-at';
const OAUTH_STATE_KEY = 'spotify-oauth-state';
const CODE_VERIFIER_KEY = 'spotify-code-verifier';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export interface SpotifyTokenSet {
  accessToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

export function getSpotifyClientId(): string {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
}

export function getSpotifyRedirectUri(): string {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();
  return configured || `${window.location.origin}/configuracoes`;
}

function validateSpotifyRedirectUri(redirectUri: string) {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error('VITE_SPOTIFY_REDIRECT_URI precisa ser uma URL válida, cadastrada no Spotify Developer.');
  }
  if (url.origin !== window.location.origin || url.pathname !== '/configuracoes') {
    throw new Error(
      `A URL de retorno deve ser ${window.location.origin}/configuracoes. Use exatamente o mesmo endereço (localhost ou 127.0.0.1) no Spotify Developer e no VITE_SPOTIFY_REDIRECT_URI.`,
    );
  }
  return url.toString();
}

function createRandomString(size: number): string {
  const values = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function createChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(hash);
  let binary = '';
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function beginSpotifyAuthorization(): Promise<void> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error('Configure VITE_SPOTIFY_CLIENT_ID no frontend/.env e cadastre a URL de retorno no Spotify Developer.');
  const redirectUri = validateSpotifyRedirectUri(getSpotifyRedirectUri());

  const verifier = createRandomString(64);
  const state = createRandomString(24);
  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const query = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: await createChallenge(verifier),
    state,
    scope: [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
    ].join(' '),
  });
  window.location.assign(`${SPOTIFY_AUTH_URL}?${query}`);
}

async function requestTokens(body: URLSearchParams): Promise<SpotifyTokenSet> {
  let response: Response;
  try {
    response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new Error('Não foi possível acessar o Spotify. Verifique sua conexão e tente novamente.');
  }
  let data: TokenResponse;
  try {
    data = await response.json() as TokenResponse;
  } catch {
    throw new Error('O Spotify retornou uma resposta inválida ao solicitar o token.');
  }
  if (!response.ok || !data.access_token) {
    const description = data.error_description ?? data.error;
    if (description?.toLowerCase().includes('redirect_uri')) {
      throw new Error('O Spotify recusou a URL de retorno. Confira se ela está cadastrada e idêntica no Spotify Developer e no frontend/.env.');
    }
    if (data.error === 'invalid_grant') {
      throw new Error('O código de autorização expirou ou já foi usado. Conecte sua conta do Spotify novamente.');
    }
    throw new Error(description ? `Spotify: ${description}` : 'Não foi possível autorizar a conta do Spotify.');
  }
  if (data.token_type.toLowerCase() !== 'bearer' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) {
    throw new Error('O Spotify retornou uma credencial inválida.');
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

export async function finishSpotifyAuthorization(search: string): Promise<SpotifyTokenSet> {
  const params = new URLSearchParams(search);
  const returnedError = params.get('error');
  if (returnedError) throw new Error(returnedError === 'access_denied' ? 'A conexão com o Spotify foi cancelada.' : 'O Spotify recusou a autorização.');

  const code = params.get('code');
  const receivedState = params.get('state');
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
  if (!code || !receivedState || !expectedState || receivedState !== expectedState || !verifier) {
    throw new Error('A confirmação do Spotify expirou ou não corresponde a esta sessão. Conecte novamente.');
  }

  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error('Configure VITE_SPOTIFY_CLIENT_ID no frontend/.env.');
  const redirectUri = validateSpotifyRedirectUri(getSpotifyRedirectUri());
  return requestTokens(new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }));
}

export function getStoredSpotifyAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isSpotifyConnected(): boolean {
  return Boolean(sessionStorage.getItem(REFRESH_TOKEN_KEY));
}

export async function getSpotifyAccessToken(): Promise<SpotifyTokenSet> {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY));
  if (accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) {
    return { accessToken, expiresAt };
  }

  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  const clientId = getSpotifyClientId();
  if (!refreshToken || !clientId) throw new Error('Conecte novamente sua conta do Spotify.');
  return requestTokens(new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }));
}

export function disconnectSpotify(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
}
