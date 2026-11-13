import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkspaceBackground() {
  const { backgroundVideo, backgroundVideoError, performance } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePlayback = () => {
      if (performance || reduceMotion.matches) {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };
    updatePlayback();
    reduceMotion.addEventListener('change', updatePlayback);
    return () => reduceMotion.removeEventListener('change', updatePlayback);
  }, [backgroundVideo?.url, performance]);

  return (
    <>
      {backgroundVideo?.url && (
        <div className="workspace-video-background" aria-hidden="true">
          <video ref={videoRef} src={backgroundVideo.url} muted loop playsInline preload="metadata" />
          <span />
        </div>
      )}
      {backgroundVideoError && <p className="sr-only" role="status">{backgroundVideoError}</p>}
    </>
  );
}
