import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { printerProfiles, type PrinterProfile } from '../data/printers';
import { getSpotifyEmbedUrl } from '../lib/spotify';
import { getWallpaperVideo, removeWallpaperVideo, saveWallpaperVideo } from '../lib/workspaceStorage';

export type Wallpaper = 'aurora' | 'studio' | 'carbon' | 'forest' | 'custom';

export interface WorkspaceVideo {
  id?: string;
  url: string;
  title: string;
  kind: 'local' | 'pexels' | 'commons';
  pageUrl?: string;
  photographer?: string;
  photographerUrl?: string;
}

export interface PhotocardLayout {
  x: number;
  y: number;
  size: number;
}

export interface PricingSettings {
  electricityRatePerKwh: number;
  maintenanceCostPerHour: number;
  laborHourlyRate: number;
  materialWastePercent: number;
  profitMarginPercent: number;
  extraCostPerUnit: number;
  printerPowerWatts: Record<string, number>;
}

interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
  performance: boolean;
  togglePerformance: () => void;
  wallpaper: Wallpaper;
  setWallpaper: (wallpaper: Exclude<Wallpaper, 'custom'>) => void;
  backgroundImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  backgroundVideo: WorkspaceVideo | null;
  backgroundVideoError: string;
  setBackgroundVideo: (video: (Omit<WorkspaceVideo, 'url'> & { url?: string }) | null, file?: File) => Promise<void>;
  backgroundStart: string;
  backgroundEnd: string;
  setBackgroundColors: (start: string, end: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  photocardImage: string | null;
  photocardCaption: string;
  photocardLayout: PhotocardLayout;
  setPhotocard: (image: string | null, caption: string) => void;
  setPhotocardLayout: (layout: PhotocardLayout) => void;
  spotifyUrl: string;
  setSpotifyUrl: (url: string | null) => void;
  spotifyEmbedUrl: string | null;
  activePrinter: PrinterProfile;
  printers: PrinterProfile[];
  setActivePrinter: (id: string) => void;
  addPrinter: (printer: Omit<PrinterProfile, 'id'>) => void;
  updatePrinter: (id: string, printer: Omit<PrinterProfile, 'id'>) => void;
  removePrinter: (id: string) => void;
  pricingSettings: PricingSettings;
  updatePricingSettings: <K extends keyof Omit<PricingSettings, 'printerPowerWatts'>>(key: K, value: PricingSettings[K]) => void;
  setPrinterPowerWatts: (printerId: string, watts: number) => void;
}

const wallpaperPresets: Record<Exclude<Wallpaper, 'custom'>, { start: string; end: string }> = {
  aurora: { start: '#c4d5e8', end: '#d8c8e8' },
  studio: { start: '#101b2c', end: '#283a55' },
  carbon: { start: '#202936', end: '#526171' },
  forest: { start: '#c6ddd1', end: '#d8d1bd' },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const defaultPricingSettings: PricingSettings = {
  electricityRatePerKwh: 0,
  maintenanceCostPerHour: 0,
  laborHourlyRate: 0,
  materialWastePercent: 5,
  profitMarginPercent: 35,
  extraCostPerUnit: 0,
  printerPowerWatts: {},
};

function readStoredPrinters(): PrinterProfile[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('custom-printers') ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((printer): printer is PrinterProfile =>
      typeof printer?.id === 'string' &&
      typeof printer?.name === 'string' &&
      typeof printer?.volumeX === 'number' &&
      typeof printer?.volumeY === 'number' &&
      typeof printer?.volumeZ === 'number' &&
      (typeof printer?.powerWatts === 'number' || printer?.powerWatts === undefined) &&
      Array.isArray(printer?.supportedMaterials),
    ).map((printer) => ({ ...printer, powerWatts: printer.powerWatts ?? 0 }));
  } catch {
    return [];
  }
}

function readPricingSettings(): PricingSettings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('workspace-pricing-settings') ?? 'null');
    if (!stored || typeof stored !== 'object') return defaultPricingSettings;
    const values = stored as Partial<PricingSettings>;
    const safeNumber = (value: unknown, fallback: number, max: number) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;
    const watts = values.printerPowerWatts && typeof values.printerPowerWatts === 'object'
      ? Object.fromEntries(Object.entries(values.printerPowerWatts).filter(([, value]) =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000,
        ))
      : {};
    return {
      electricityRatePerKwh: safeNumber(values.electricityRatePerKwh, 0, 100_000),
      maintenanceCostPerHour: safeNumber(values.maintenanceCostPerHour, 0, 100_000),
      laborHourlyRate: safeNumber(values.laborHourlyRate, 0, 100_000),
      materialWastePercent: safeNumber(values.materialWastePercent, 5, 100),
      profitMarginPercent: safeNumber(values.profitMarginPercent, 35, 80),
      extraCostPerUnit: safeNumber(values.extraCostPerUnit, 0, 100_000),
      printerPowerWatts: watts,
    };
  } catch (error) {
    console.error('Não foi possível ler as configurações de preço salvas.', error);
    return defaultPricingSettings;
  }
}

function readColor(key: string, fallback: string) {
  const value = localStorage.getItem(key);
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function readStoredImage(key: string, maxLength: number): string | null {
  const image = localStorage.getItem(key);
  if (!image || image.length > maxLength) return null;
  if (/^data:image\/jpeg;base64,[\da-z+/]+=*$/i.test(image)) return image;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' &&
      ['thumb.wikimedia.org', 'upload.wikimedia.org', 'images.pexels.com'].includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isAllowedWallpaperImage(image: string) {
  if (/^data:image\/jpeg;base64,[\da-z+/]+=*$/i.test(image)) return true;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' &&
      ['thumb.wikimedia.org', 'upload.wikimedia.org', 'images.pexels.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function readStoredWallpaperVideo(): WorkspaceVideo | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('workspace-background-video') ?? 'null');
    if (!stored || typeof stored !== 'object') return null;
    const video = stored as Partial<WorkspaceVideo>;
    if (video.kind === 'local' && typeof video.id === 'string' && typeof video.title === 'string') {
      return { id: video.id, kind: 'local', title: video.title, url: '' };
    }
    if ((video.kind === 'pexels' || video.kind === 'commons') && typeof video.url === 'string' && typeof video.title === 'string' &&
      typeof video.pageUrl === 'string' && typeof video.photographer === 'string' &&
      typeof video.photographerUrl === 'string') {
      const url = new URL(video.url);
      const validHost = video.kind === 'pexels'
        ? url.hostname === 'videos.pexels.com'
        : url.hostname === 'upload.wikimedia.org' && /\.(webm|mp4)$/i.test(url.pathname);
      if (url.protocol === 'https:' && validHost) {
        return {
          kind: video.kind,
          title: video.title.slice(0, 180),
          url: url.toString(),
          pageUrl: video.pageUrl,
          photographer: video.photographer.slice(0, 100),
          photographerUrl: video.photographerUrl,
        };
      }
    }
  } catch (error) {
    console.error('Não foi possível ler o wallpaper de vídeo salvo.', error);
    return null;
  }
  return null;
}

const defaultPhotocardLayout: PhotocardLayout = { x: 78, y: 12, size: 160 };

function readPhotocardLayout(): PhotocardLayout {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('workspace-photocard-layout') ?? 'null');
    if (!stored || typeof stored !== 'object') return defaultPhotocardLayout;
    const layout = stored as Partial<PhotocardLayout>;
    return {
      x: typeof layout.x === 'number' && Number.isFinite(layout.x) ? Math.min(100, Math.max(0, layout.x)) : defaultPhotocardLayout.x,
      y: typeof layout.y === 'number' && Number.isFinite(layout.y) ? Math.min(100, Math.max(0, layout.y)) : defaultPhotocardLayout.y,
      size: typeof layout.size === 'number' && Number.isFinite(layout.size) ? Math.min(260, Math.max(120, layout.size)) : defaultPhotocardLayout.size,
    };
  } catch (error) {
    console.error('Não foi possível ler a posição do photocard salva.', error);
    return defaultPhotocardLayout;
  }
}

function readStoredPhotocard(): { image: string | null; caption: string } {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('workspace-photocard') ?? 'null');
    if (!value || typeof value !== 'object') return { image: null, caption: '' };
    const stored = value as { image?: unknown; caption?: unknown };
    const image = typeof stored.image === 'string' ? stored.image : null;
    const validImage = image && image.length <= 240_000 && /^data:image\/jpeg;base64,[\da-z+/]+=*$/i.test(image) ? image : null;
    const caption = typeof stored.caption === 'string' ? stored.caption.slice(0, 80) : '';
    return { image: validImage, caption };
  } catch {
    return { image: null, caption: '' };
  }
}

function readSpotifyUrl(): string {
  const stored = localStorage.getItem('workspace-spotify-url') ?? '';
  return getSpotifyEmbedUrl(stored) ? stored : '';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [performance, setPerformance] = useState<boolean>(() => localStorage.getItem('perf') === '1');
  const [wallpaper, setWallpaper] = useState<Wallpaper>(() => {
    const saved = localStorage.getItem('workspace-wallpaper');
    return saved && (saved === 'custom' || Object.prototype.hasOwnProperty.call(wallpaperPresets, saved)) ? saved as Wallpaper : 'aurora';
  });
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(() => readStoredImage('workspace-background-image', 440_000));
  const [backgroundVideo, setBackgroundVideoState] = useState<WorkspaceVideo | null>(readStoredWallpaperVideo);
  const [backgroundVideoError, setBackgroundVideoError] = useState('');
  const [backgroundStart, setBackgroundStart] = useState(() => readColor('workspace-background-start', wallpaperPresets[wallpaper === 'custom' ? 'aurora' : wallpaper].start));
  const [backgroundEnd, setBackgroundEnd] = useState(() => readColor('workspace-background-end', wallpaperPresets[wallpaper === 'custom' ? 'aurora' : wallpaper].end));
  const [accentColor, setAccentColorState] = useState(() => readColor('workspace-accent', '#6757c8'));
  const [storedPhotocard] = useState(readStoredPhotocard);
  const [photocardImage, setPhotocardImage] = useState<string | null>(storedPhotocard.image);
  const [photocardCaption, setPhotocardCaption] = useState(storedPhotocard.caption);
  const [photocardLayout, setPhotocardLayoutState] = useState(readPhotocardLayout);
  const [spotifyUrl, setSpotifyUrlState] = useState(readSpotifyUrl);
  const spotifyEmbedUrl = useMemo(() => getSpotifyEmbedUrl(spotifyUrl), [spotifyUrl]);
  const [customPrinters, setCustomPrinters] = useState<PrinterProfile[]>(readStoredPrinters);
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => localStorage.getItem('workspace-printer') ?? printerProfiles[0].id);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(readPricingSettings);

  useEffect(() => {
    if (!backgroundVideo || backgroundVideo.kind !== 'local' || !backgroundVideo.id || backgroundVideo.url) return;
    let active = true;
    getWallpaperVideo(backgroundVideo.id).then((stored) => {
      if (!active) return;
      if (!stored) {
        setBackgroundVideoError('O vídeo salvo neste navegador não foi encontrado. Selecione outro arquivo.');
        return;
      }
      setBackgroundVideoState({ ...backgroundVideo, url: URL.createObjectURL(stored.blob) });
      setBackgroundVideoError('');
    }).catch((error: unknown) => {
      if (!active) return;
      setBackgroundVideoError(error instanceof Error ? error.message : 'Não foi possível carregar o vídeo salvo.');
    });
    return () => { active = false; };
  }, [backgroundVideo]);

  useEffect(() => {
    return () => {
      if (backgroundVideo?.kind === 'local' && backgroundVideo.url) URL.revokeObjectURL(backgroundVideo.url);
    };
  }, [backgroundVideo]);

  const printers = useMemo(() => [...printerProfiles, ...customPrinters], [customPrinters]);
  const activePrinter = printers.find((printer) => printer.id === selectedPrinterId) ?? printers[0];

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.perf = performance ? '1' : '0';
    localStorage.setItem('perf', performance ? '1' : '0');
  }, [performance]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--workspace-image', `linear-gradient(135deg, ${backgroundStart} 0%, color-mix(in srgb, ${backgroundStart} 48%, ${backgroundEnd}) 50%, ${backgroundEnd} 100%)`);
    root.style.setProperty('--workspace-photo', backgroundImage ? `url("${backgroundImage}")` : 'none');
    root.style.setProperty('--workspace-start', backgroundStart);
    root.style.setProperty('--workspace-end', backgroundEnd);
    root.style.setProperty('--accent-solid', accentColor);
    root.style.setProperty('--color-accent-from', accentColor);
    root.style.setProperty('--color-accent-to', `color-mix(in srgb, ${accentColor} 72%, #ec4899)`);
    localStorage.setItem('workspace-background-start', backgroundStart);
    localStorage.setItem('workspace-background-end', backgroundEnd);
    localStorage.setItem('workspace-accent', accentColor);
  }, [backgroundStart, backgroundEnd, accentColor, backgroundImage]);

  useEffect(() => {
    localStorage.setItem('workspace-wallpaper', wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    localStorage.setItem('custom-printers', JSON.stringify(customPrinters));
  }, [customPrinters]);

  useEffect(() => {
    localStorage.setItem('workspace-printer', selectedPrinterId);
  }, [selectedPrinterId]);

  useEffect(() => {
    localStorage.setItem('workspace-pricing-settings', JSON.stringify(pricingSettings));
  }, [pricingSettings]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem('workspace-photocard-layout', JSON.stringify(photocardLayout));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [photocardLayout]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      dark,
      toggleTheme: () => setDark((current) => !current),
      performance,
      togglePerformance: () => setPerformance((current) => !current),
      wallpaper,
      setWallpaper: (next) => {
        setWallpaper(next);
        localStorage.removeItem('workspace-background-image');
        setBackgroundImageState(null);
        const previousVideo = backgroundVideo;
        localStorage.removeItem('workspace-background-video');
        setBackgroundStart(wallpaperPresets[next].start);
        setBackgroundEnd(wallpaperPresets[next].end);
        setBackgroundVideoState(null);
        if (previousVideo?.kind === 'local' && previousVideo.id) {
          removeWallpaperVideo(previousVideo.id).catch((error: unknown) => {
            console.error('Não foi possível remover o wallpaper de vídeo local.', error);
          });
        }
      },
      backgroundImage,
      setBackgroundImage: (image) => {
        if (image && (!isAllowedWallpaperImage(image) || image.length > 440_000)) {
          throw new Error('A imagem de fundo não está no formato esperado ou é muito grande. Use uma imagem licenciada do Wikimedia Commons ou envie um arquivo de até 320 KB.');
        }
        if (backgroundVideo?.kind === 'local' && backgroundVideo.id) {
          removeWallpaperVideo(backgroundVideo.id).catch((error: unknown) => {
            console.error('Não foi possível remover o wallpaper de vídeo local.', error);
          });
        }
        localStorage.removeItem('workspace-background-video');
        setBackgroundVideoState(null);
        if (image) localStorage.setItem('workspace-background-image', image);
        else localStorage.removeItem('workspace-background-image');
        setBackgroundImageState(image);
        if (image) setWallpaper('custom');
      },
      backgroundVideo,
      backgroundVideoError,
      setBackgroundVideo: async (video, file) => {
        if (!video) {
          const previousVideo = backgroundVideo;
          localStorage.removeItem('workspace-background-video');
          setBackgroundVideoState(null);
          setBackgroundVideoError('');
          if (previousVideo?.kind === 'local' && previousVideo.id) {
            await removeWallpaperVideo(previousVideo.id);
          }
          return;
        }

        if (video.kind === 'local') {
          if (!file) throw new Error('Selecione novamente o arquivo de vídeo local.');
          const id = crypto.randomUUID();
          await saveWallpaperVideo(id, file);
          const nextVideo: WorkspaceVideo = { id, kind: 'local', title: video.title, url: URL.createObjectURL(file) };
          localStorage.setItem('workspace-background-video', JSON.stringify({ id, kind: 'local', title: nextVideo.title }));
          localStorage.removeItem('workspace-background-image');
          setBackgroundImageState(null);
          setBackgroundVideoState(nextVideo);
        } else {
          let mediaUrl: URL;
          let pageUrl: URL;
          let photographerUrl: URL;
          try {
            mediaUrl = new URL(video.url ?? '');
            pageUrl = new URL(video.pageUrl ?? '');
            photographerUrl = new URL(video.photographerUrl ?? '');
          } catch {
            throw new Error('O resultado do vídeo contém um endereço inválido.');
          }
          const validProvider = video.kind === 'pexels'
            ? mediaUrl.hostname === 'videos.pexels.com' && pageUrl.hostname === 'www.pexels.com' && photographerUrl.hostname === 'www.pexels.com'
            : video.kind === 'commons' && mediaUrl.hostname === 'upload.wikimedia.org' &&
              /\.(webm|mp4)$/i.test(mediaUrl.pathname) &&
              pageUrl.hostname === 'commons.wikimedia.org' &&
              photographerUrl.hostname === 'commons.wikimedia.org';
          if (mediaUrl.protocol !== 'https:' || pageUrl.protocol !== 'https:' || photographerUrl.protocol !== 'https:' || !validProvider) {
            throw new Error('Este vídeo não veio de um resultado válido do provedor selecionado.');
          }
          if (backgroundVideo?.kind === 'local' && backgroundVideo.id) await removeWallpaperVideo(backgroundVideo.id);
          const nextVideo: WorkspaceVideo = {
            kind: video.kind,
            title: video.title.slice(0, 180),
            url: mediaUrl.toString(),
            pageUrl: pageUrl.toString(),
            photographer: video.photographer?.slice(0, 100),
            photographerUrl: photographerUrl.toString(),
          };
          localStorage.setItem('workspace-background-video', JSON.stringify(nextVideo));
          localStorage.removeItem('workspace-background-image');
          setBackgroundImageState(null);
          setBackgroundVideoState(nextVideo);
        }
        setBackgroundVideoError('');
        setWallpaper('custom');
      },
      backgroundStart,
      backgroundEnd,
      setBackgroundColors: (start, end) => {
        setWallpaper('custom');
        setBackgroundStart(start);
        setBackgroundEnd(end);
      },
      accentColor,
      setAccentColor: setAccentColorState,
      photocardImage,
      photocardCaption,
      photocardLayout,
      setPhotocard: (image, caption) => {
        const safeCaption = caption.trim().slice(0, 80);
        if (image && (!/^data:image\/jpeg;base64,[\da-z+/]+=*$/i.test(image) || image.length > 240_000)) {
          throw new Error('A foto do photocard não está no formato esperado ou é muito grande.');
        }
        if (image) localStorage.setItem('workspace-photocard', JSON.stringify({ image, caption: safeCaption }));
        else localStorage.removeItem('workspace-photocard');
        setPhotocardImage(image);
        setPhotocardCaption(image ? safeCaption : '');
      },
      setPhotocardLayout: (layout) => {
        setPhotocardLayoutState({
          x: Number.isFinite(layout.x) ? Math.min(100, Math.max(0, layout.x)) : defaultPhotocardLayout.x,
          y: Number.isFinite(layout.y) ? Math.min(100, Math.max(0, layout.y)) : defaultPhotocardLayout.y,
          size: Number.isFinite(layout.size) ? Math.min(260, Math.max(120, layout.size)) : defaultPhotocardLayout.size,
        });
      },
      spotifyUrl,
      setSpotifyUrl: (url) => {
        if (url && !getSpotifyEmbedUrl(url)) throw new Error('Use um link válido de faixa, álbum, playlist ou podcast do Spotify.');
        if (url) localStorage.setItem('workspace-spotify-url', url);
        else localStorage.removeItem('workspace-spotify-url');
        setSpotifyUrlState(url ?? '');
      },
      spotifyEmbedUrl,
      activePrinter,
      printers,
      setActivePrinter: setSelectedPrinterId,
      addPrinter: (printer) => {
        const id = `custom-${crypto.randomUUID()}`;
        setCustomPrinters((current) => [...current, { ...printer, id }]);
        setSelectedPrinterId(id);
      },
      updatePrinter: (id, printer) => {
        setCustomPrinters((current) => current.map((item) => item.id === id ? { ...printer, id } : item));
      },
      removePrinter: (id) => {
        setCustomPrinters((current) => current.filter((printer) => printer.id !== id));
        if (selectedPrinterId === id) setSelectedPrinterId(printerProfiles[0].id);
      },
      pricingSettings,
      updatePricingSettings: (key, value) => {
        setPricingSettings((current) => ({ ...current, [key]: value }));
      },
      setPrinterPowerWatts: (printerId, watts) => {
        setPricingSettings((current) => ({
          ...current,
          printerPowerWatts: { ...current.printerPowerWatts, [printerId]: watts },
        }));
      },
    }),
    [dark, performance, wallpaper, backgroundImage, backgroundVideo, backgroundVideoError, backgroundStart, backgroundEnd, accentColor, photocardImage, photocardCaption, photocardLayout, spotifyUrl, spotifyEmbedUrl, activePrinter, printers, selectedPrinterId, pricingSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
