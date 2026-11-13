import { useTheme } from '../contexts/ThemeContext';
import { useSpotify } from '../contexts/SpotifyContext';
import { Disc3, Move, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useFeatures } from '../contexts/FeaturesContext';

function reportPlaybackError(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Não foi possível controlar o Spotify.');
}

export default function WorkspaceWidgets() {
  const { photocardImage, photocardCaption, photocardLayout, setPhotocardLayout, spotifyEmbedUrl } = useTheme();
  const { connected, connecting, playback, error, play, pause, next, previous } = useSpotify();
  const { features } = useFeatures();
  const spotifyEnabled = features?.spotify !== false;
  const cardRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  function startPhotocardDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const card = cardRef.current;
    if (!card) return;
    event.preventDefault();
    const bounds = card.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePhotocard(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const maxLeft = Math.max(8, viewport.width - photocardLayout.size - 8);
    const cardHeight = cardRef.current?.offsetHeight ?? photocardLayout.size * 1.35;
    const maxTop = Math.max(8, viewport.height - cardHeight - 8);
    const left = Math.min(maxLeft, Math.max(8, drag.left + event.clientX - drag.x));
    const top = Math.min(maxTop, Math.max(8, drag.top + event.clientY - drag.y));
    setPhotocardLayout({
      ...photocardLayout,
      x: maxLeft === 8 ? 0 : ((left - 8) / (maxLeft - 8)) * 100,
      y: maxTop === 8 ? 0 : ((top - 8) / (maxTop - 8)) * 100,
    });
  }

  function finishPhotocardDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const photocardLeft = 8 + (Math.max(0, viewport.width - photocardLayout.size - 16) * photocardLayout.x) / 100;
  const photocardTop = 8 + (Math.max(0, viewport.height - photocardLayout.size * 1.35 - 16) * photocardLayout.y) / 100;

  if (!photocardImage && (!spotifyEnabled || (!spotifyEmbedUrl && !connected && !connecting))) return null;

  return (
    <>
      {photocardImage && createPortal(
        <figure
          ref={cardRef}
          className="workspace-photocard"
          style={{ width: `${photocardLayout.size}px`, left: `${photocardLeft}px`, top: `${photocardTop}px` }}
        >
          <button
            type="button"
            className="workspace-photocard__drag-handle"
            aria-label="Mover photocard"
            title="Arraste para mudar o photocard de lugar"
            onPointerDown={startPhotocardDrag}
            onPointerMove={movePhotocard}
            onPointerUp={finishPhotocardDrag}
            onPointerCancel={finishPhotocardDrag}
          >
            <Move size={14} /> Mover
          </button>
          <img src={photocardImage} alt={photocardCaption || 'Foto do seu lugar favorito'} />
          {photocardCaption && <figcaption>{photocardCaption}</figcaption>}
        </figure>,
        document.body,
      )}
      <div className="workspace-widgets">
        {spotifyEnabled && connected && (
          <section className="workspace-account-player" aria-label="Player da sua conta Spotify">
            <span className="workspace-account-player__brand"><Disc3 size={15} /> Spotify</span>
            {playback?.albumImage ? (
              <img className="workspace-account-player__cover" src={playback.albumImage} alt={`Capa de ${playback.title}`} />
            ) : (
              <span className="workspace-account-player__cover workspace-account-player__cover--empty"><Disc3 size={24} /></span>
            )}
            <div className="workspace-account-player__track" aria-live="polite">
              {connecting && !playback ? (
                <>
                  <strong>Conectando player…</strong>
                  <small>Preparando sua conta</small>
                </>
              ) : playback ? (
                <>
                  <strong title={playback.title}>{playback.title}</strong>
                  <small title={playback.artists}>{playback.artists}</small>
                </>
              ) : (
                <>
                  <strong>Nenhuma música ativa</strong>
                  <small>Inicie uma faixa no Spotify para transferi-la para cá</small>
                </>
              )}
            </div>
            <div className="workspace-account-player__controls">
              <button type="button" onClick={() => void previous().catch(reportPlaybackError)} aria-label="Faixa anterior" title="Faixa anterior"><SkipBack size={16} /></button>
              <button type="button" className="workspace-account-player__play" onClick={() => void (playback?.isPlaying ? pause() : play()).catch(reportPlaybackError)} aria-label={playback?.isPlaying ? 'Pausar música' : 'Reproduzir música'} title={playback?.isPlaying ? 'Pausar' : 'Reproduzir'}>
                {playback?.isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
              </button>
              <button type="button" onClick={() => void next().catch(reportPlaybackError)} aria-label="Próxima faixa" title="Próxima faixa"><SkipForward size={16} /></button>
            </div>
            {error && <span className="workspace-account-player__error" role="status">{error}</span>}
          </section>
        )}
        {spotifyEnabled && spotifyEmbedUrl && !connected && (
          <div className="workspace-music">
            <iframe
              src={spotifyEmbedUrl}
              title="Player incorporado do Spotify"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </div>
        )}
      </div>
    </>
  );
}
