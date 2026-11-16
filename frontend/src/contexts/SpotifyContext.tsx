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
  activateElement(): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
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

function spotifyErrorMessage(status: number, fallback: string) {
  if (status === 401) return 'A autorização do Spotify expirou. Conecte novamente.';
  if (status === 403) return 'O Spotify não autorizou a ação. Confirme a conta Premium e o acesso de desenvolvimento do app.';
  if (status === 429) return 'O Spotify limitou temporariamente as requisições. Aguarde um instante e tente novamente.';
  return fallback;
}

async function transferToDevice(token: string, deviceId: string, play: boolean) {
  const response = await spotifyRequest('/me/player', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('O player do Control 3D ainda não foi reconhecido pelo Spotify. Recarregue a página e tente novamente.');
    throw new Error(spotifyErrorMessage(response.status, 'Não foi possível ativar o player do Control 3D.'));
  }
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
  const clientConfigured = Boolean(getSpotifyClientId());
  const [accessToken, setAccessToken] = useState(getStoredSpotifyAccessToken);
  const [connected, setConnected] = useState(() => clientConfigured && isSpotifyConnected());
  const [connecting, setConnecting] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);
  const [error, setError] = useState('');
  const player = useMemo(() => ({ current: null as SpotifyPlayer | null }), []);
  const processedAuthorizationResponse = useRef('');

  useEffect(() => {
    if (!clientConfigured) {
      setConnected(false);
      setConnecting(false);
      setDeviceId('');
      setPlayback(null);
    }
  }, [clientConfigured]);

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
          // Não toma a reprodução de outro aparelho sozinho: apenas mostra
          // a faixa atual. A transferência acontece quando o usuário controla o player.
          void getSpotifyAccessToken()
            .then(({ accessToken: token }) => {
              setAccessToken(token);
              return currentSpotifyPlayback(token);
            })
            .then((state) => {
              if (active && state?.item) setPlayback(fromTrack(state.item, state.is_playing));
            })
            .catch(() => { /* o player continua pronto mesmo sem faixa ativa */ });
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
        void refreshPlayback().catch(() => { /* falhas transitórias do polling não viram erro na tela */ });
      }
    }, 15_000);
    const refreshOnCommand = () => {
      void refreshPlayback().catch(() => { /* o próximo ciclo de polling tenta de novo */ });
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
      if (!clientConfigured) {
        throw new Error('Configure o Client ID e a URL de retorno do Spotify para usar o player da conta. Você ainda pode usar o player por link abaixo.');
      }
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
    const current = player.current;
    if (!deviceId || !current) {
      throw new Error('O player do Control 3D ainda está inicializando. Aguarde alguns segundos e tente novamente.');
    }

    const state = await currentSpotifyPlayback(token);
    const activeHere = state?.device?.id === deviceId;

    if (!state) {
      if (action !== 'play') {
        setError('');
        return;
      }
      // Nenhuma reprodução ativa: tenta retomar a última faixa da conta neste dispositivo.
      const resumed = await spotifyRequest(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, token, { method: 'PUT' });
      if (!resumed.ok) {
        if (resumed.status === 404) throw new Error('Nada para retomar agora. Abra o Spotify, dê play em uma faixa e tente novamente.');
        throw new Error(spotifyErrorMessage(resumed.status, 'Não foi possível iniciar a reprodução.'));
      }
      setError('');
      scheduleRefresh();
      return;
    }

    if (!activeHere) {
      const autoplay = action !== 'pause' && state.is_playing;
      await transferToDevice(token, deviceId, autoplay);
      if (autoplay && state.item) {
        setPlayback(fromTrack(state.item, true));
        setError('');
        scheduleRefresh();
        return;
      }
    }

    try {
      // Necessário em navegadores com bloqueio de autoplay; o clique do usuário já autoriza.
      await current.activateElement();
    } catch { /* segue com os métodos do SDK */ }

    if (action === 'play') {
      if (state.item) await current.resume();
      else {
        const resumed = await spotifyRequest(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, token, { method: 'PUT' });
        if (!resumed.ok) {
          if (resumed.status === 404) throw new Error('Nada para retomar agora. Abra o Spotify, dê play em uma faixa e tente novamente.');
          throw new Error(spotifyErrorMessage(resumed.status, 'Não foi possível iniciar a reprodução.'));
        }
      }
    } else if (action === 'pause') {
      await current.pause();
    } else if (action === 'next') {
      await current.nextTrack();
    } else {
      await current.previousTrack();
    }

    setError('');
    scheduleRefresh();
  }

  function scheduleRefresh() {
    window.setTimeout(() => window.dispatchEvent(new Event('spotify:refresh-playback')), 700);
  }

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) throw new Error('useSpotify must be used inside SpotifyProvider');
  return context;
}
