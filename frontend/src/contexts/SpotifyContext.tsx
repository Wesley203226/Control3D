import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  beginSpotifyAuthorization,
  disconnectSpotify,
  finishSpotifyAuthorization,
  getSpotifyAccessToken,
  getSpotifyClientId,
  getStoredSpotifyAccessToken,
  isSpotifyConnected,
} from '../lib/spotifyAuth';

interface SpotifyPlayback {
  title: string;
  artists: string;
  albumImage: string | null;
  isPlaying: boolean;
}

interface SdkTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string }> };
}

interface SpotifyPlaybackState {
  paused: boolean;
  track_window: { current_track: SdkTrack | null };
}

interface SpotifyReadyState {
  device_id: string;
}

interface SpotifyErrorState {
  message: string;
}

interface SpotifyPlayer {
  addListener(event: 'ready' | 'not_ready', callback: (state: SpotifyReadyState) => void): boolean;
  addListener(event: 'player_state_changed', callback: (state: SpotifyPlaybackState | null) => void): boolean;
  addListener(event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error', callback: (state: SpotifyErrorState) => void): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
}

interface SpotifyApi {
  Player: new (options: {
    name: string;
    volume: number;
    getOAuthToken: (callback: (token: string) => void) => void;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifyApi;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyContextValue {
  clientConfigured: boolean;
  connected: boolean;
  connecting: boolean;
  error: string;
  playback: SpotifyPlayback | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
}

interface SpotifyApiTrack {
  name: string;
  artists?: Array<{ name: string }>;
  album?: { images?: Array<{ url: string }> };
}

interface SpotifyApiPlayback {
  is_playing: boolean;
  item: SpotifyApiTrack | null;
  device?: { id: string | null } | null;
}

async function spotifyRequest(path: string, token: string, options: RequestInit = {}) {
  return fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

async function currentSpotifyPlayback(token: string): Promise<SpotifyApiPlayback | null> {
  const response = await spotifyRequest('/me/player', token);
  if (response.status === 204) return null;
  if (!response.ok) {
    if (response.status === 401) throw new Error('A autorização do Spotify expirou. Conecte novamente.');
    if (response.status === 403) throw new Error('O Spotify negou o acesso ao dispositivo. Confirme a conta Premium e se ela está autorizada no app Spotify Developer.');
    throw new Error('Não foi possível consultar a reprodução atual do Spotify.');
  }
  return await response.json() as SpotifyApiPlayback;
}

async function transferPlaybackToDevice(token: string, deviceId: string, required = true): Promise<SpotifyApiPlayback | null> {
  const playback = await currentSpotifyPlayback(token);
  if (!playback?.item) {
    if (required) throw new Error('Abra o Spotify e inicie uma música em um dispositivo; depois tente transferir para o Control 3D.');
    return null;
  }
  if (playback.device?.id === deviceId) return playback;

  const response = await spotifyRequest('/me/player', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: playback.is_playing }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('A autorização do Spotify expirou. Conecte novamente.');
    if (response.status === 403) throw new Error('O Spotify não permitiu transferir a música. Verifique a conta Premium, a autorização do app e as permissões de reprodução.');
    if (response.status === 404) throw new Error('O player do navegador ainda não está disponível. Aguarde alguns segundos e tente novamente.');
    throw new Error('Não foi possível transferir a música para o player do Control 3D.');
  }
  return playback;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);
let sdkPromise: Promise<void> | null = null;

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      sdkPromise = null;
      reject(new Error('O player do Spotify não carregou. Verifique a conexão e tente novamente.'));
    }, 15_000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-spotify-sdk]');
    if (existing) {
      existing.addEventListener('error', () => {
        window.clearTimeout(timer);
        sdkPromise = null;
        reject(new Error('Não foi possível carregar o player oficial do Spotify.'));
      }, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.dataset.spotifySdk = 'true';
    script.onerror = () => {
      window.clearTimeout(timer);
      sdkPromise = null;
      reject(new Error('Não foi possível carregar o player oficial do Spotify.'));
    };
    document.head.append(script);
  });
  return sdkPromise;
}

function fromTrack(track: SdkTrack | SpotifyApiTrack, isPlaying: boolean): SpotifyPlayback {
  return {
    title: track.name,
    artists: track.artists?.map((artist) => artist.name).join(', ') || 'Spotify',
    albumImage: track.album?.images?.[0]?.url ?? null,
    isPlaying,
  };
}

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(getStoredSpotifyAccessToken);
  const [connected, setConnected] = useState(isSpotifyConnected);
  const [connecting, setConnecting] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);
  const [error, setError] = useState('');
  const player = useMemo(() => ({ current: null as SpotifyPlayer | null }), []);
  const processedAuthorizationResponse = useRef('');
  const clientConfigured = Boolean(getSpotifyClientId());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('error')) return;
    if (processedAuthorizationResponse.current === location.search) return;
    processedAuthorizationResponse.current = location.search;
    let active = true;
    setConnecting(true);
    setError('');
    finishSpotifyAuthorization(location.search)
      .then(({ accessToken: token }) => {
        if (!active) return;
        setAccessToken(token);
        setConnected(true);
        navigate('/configuracoes', { replace: true });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível conectar o Spotify.');
        navigate('/configuracoes', { replace: true });
      })
      .finally(() => {
        if (active) setConnecting(false);
      });
    return () => { active = false; };
  }, [location.search, navigate]);

  useEffect(() => {
    if (!accessToken || !connected || !clientConfigured) return;
    let active = true;
    let currentPlayer: SpotifyPlayer | null = null;
    setConnecting(true);
    setError('');

    void loadSpotifySdk()
      .then(() => {
        if (!active || !window.Spotify) return;
        currentPlayer = new window.Spotify.Player({
          name: 'Control 3D',
          volume: 0.55,
          getOAuthToken: (callback) => {
            void getSpotifyAccessToken()
              .then(({ accessToken: token }) => {
                setAccessToken(token);
                callback(token);
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : 'Conecte novamente o Spotify.');
              });
          },
        });
        player.current = currentPlayer;

        currentPlayer.addListener('ready', ({ device_id }) => {
          if (!active) return;
          setDeviceId(device_id);
          setConnecting(false);
          void getSpotifyAccessToken()
            .then(({ accessToken: token }) => {
              setAccessToken(token);
              return transferPlaybackToDevice(token, device_id, false);
            })
            .then((state) => {
              if (active && state?.item) setPlayback(fromTrack(state.item, state.is_playing));
            })
            .catch((reason: unknown) => {
              if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível transferir a reprodução do Spotify.');
            });
        });
        currentPlayer.addListener('not_ready', () => {
          if (active) setDeviceId('');
        });
        currentPlayer.addListener('player_state_changed', (state) => {
          if (!active || !state) return;
          const track = state.track_window.current_track;
          setPlayback(track ? fromTrack(track, !state.paused) : null);
        });
        for (const event of ['initialization_error', 'authentication_error', 'account_error', 'playback_error'] as const) {
          currentPlayer.addListener(event, ({ message }) => {
            if (active) {
              setError(message);
              setConnecting(false);
            }
          });
        }
        return currentPlayer.connect();
      })
      .then((ready) => {
        if (active && ready === false) {
          setConnecting(false);
          setError('Não foi possível conectar o player do Spotify neste navegador.');
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setConnecting(false);
        setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar o player do Spotify.');
      });

    const poll = window.setInterval(() => {
      if (active) {
        void refreshPlayback().catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a reprodução do Spotify.');
        });
      }
    }, 15_000);
    const refreshOnCommand = () => {
      void refreshPlayback().catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o Spotify.');
      });
    };
    window.addEventListener('spotify:refresh-playback', refreshOnCommand);

    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener('spotify:refresh-playback', refreshOnCommand);
      currentPlayer?.disconnect();
      if (player.current === currentPlayer) player.current = null;
    };

    async function refreshPlayback() {
      const { accessToken: token } = await getSpotifyAccessToken();
      if (!active) return;
      setAccessToken(token);
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 204) {
        setPlayback(null);
        return;
      }
      if (!response.ok) {
        if (response.status === 401) throw new Error('A autorização do Spotify expirou. Conecte novamente.');
        if (response.status === 403) throw new Error('O Spotify negou a leitura do dispositivo. Confirme se a conta está autorizada no app Spotify Developer.');
        throw new Error('Não foi possível consultar a música atual da conta Spotify.');
      }
      const data = await response.json() as SpotifyApiPlayback;
      if (data.item) setPlayback(fromTrack(data.item, data.is_playing));
      else setPlayback(null);
    }
  }, [accessToken, clientConfigured, connected, player]);

  const value = useMemo<SpotifyContextValue>(() => ({
    clientConfigured,
    connected,
    connecting,
    error,
    playback,
    connect: async () => {
      setError('');
      setConnecting(true);
      try {
        await beginSpotifyAuthorization();
      } catch (reason) {
        setConnecting(false);
        throw reason;
      }
    },
    disconnect: () => {
      player.current?.disconnect();
      player.current = null;
      disconnectSpotify();
      setAccessToken(null);
      setConnected(false);
      setConnecting(false);
      setDeviceId('');
      setPlayback(null);
      setError('');
    },
    play: () => controlPlayback('play'),
    pause: () => controlPlayback('pause'),
    next: () => controlPlayback('next'),
    previous: () => controlPlayback('previous'),
  }), [clientConfigured, connected, connecting, error, playback, player, deviceId]);

  async function controlPlayback(action: 'play' | 'pause' | 'next' | 'previous') {
    const { accessToken: token } = await getSpotifyAccessToken();
    setAccessToken(token);
    if (!deviceId) throw new Error('O player do Control 3D ainda está inicializando. Aguarde e tente novamente.');
    const state = await transferPlaybackToDevice(token, deviceId);
    if (state?.item) setPlayback(fromTrack(state.item, state.is_playing));
    const path = action === 'next' ? 'next' : action === 'previous' ? 'previous' : action;
    const query = action === 'play' ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const method = action === 'play' || action === 'pause' ? 'PUT' : 'POST';
    const response = await fetch(`https://api.spotify.com/v1/me/player/${path}${query}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('A autorização do Spotify expirou. Conecte novamente.');
      if (response.status === 403) throw new Error('O Spotify não autorizou a reprodução. Verifique a conta Premium e o acesso de desenvolvimento do app.');
      if (response.status === 404) throw new Error('Abra o Spotify em um dispositivo e tente novamente.');
      if (response.status === 429) throw new Error('O Spotify limitou temporariamente os controles. Aguarde um instante e tente novamente.');
      throw new Error('Não foi possível controlar a reprodução do Spotify.');
    }
    setError('');
    if (action === 'next' || action === 'previous') {
      window.setTimeout(() => window.dispatchEvent(new Event('spotify:refresh-playback')), 800);
    }
  }

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) throw new Error('useSpotify must be used inside SpotifyProvider');
  return context;
}
