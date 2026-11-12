import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { printerProfiles, type PrinterProfile } from '../data/printers';

export type Wallpaper = 'aurora' | 'studio' | 'carbon' | 'forest' | 'custom';

interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
  performance: boolean;
  togglePerformance: () => void;
  wallpaper: Wallpaper;
  setWallpaper: (wallpaper: Exclude<Wallpaper, 'custom'>) => void;
  backgroundStart: string;
  backgroundEnd: string;
  setBackgroundColors: (start: string, end: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  activePrinter: PrinterProfile;
  printers: PrinterProfile[];
  setActivePrinter: (id: string) => void;
  addPrinter: (printer: Omit<PrinterProfile, 'id'>) => void;
  updatePrinter: (id: string, printer: Omit<PrinterProfile, 'id'>) => void;
  removePrinter: (id: string) => void;
}

const wallpaperPresets: Record<Exclude<Wallpaper, 'custom'>, { start: string; end: string }> = {
  aurora: { start: '#c4d5e8', end: '#d8c8e8' },
  studio: { start: '#101b2c', end: '#283a55' },
  carbon: { start: '#202936', end: '#526171' },
  forest: { start: '#c6ddd1', end: '#d8d1bd' },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
      Array.isArray(printer?.supportedMaterials),
    );
  } catch {
    return [];
  }
}

function readColor(key: string, fallback: string) {
  const value = localStorage.getItem(key);
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
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
  const [backgroundStart, setBackgroundStart] = useState(() => readColor('workspace-background-start', wallpaperPresets[wallpaper === 'custom' ? 'aurora' : wallpaper].start));
  const [backgroundEnd, setBackgroundEnd] = useState(() => readColor('workspace-background-end', wallpaperPresets[wallpaper === 'custom' ? 'aurora' : wallpaper].end));
  const [accentColor, setAccentColorState] = useState(() => readColor('workspace-accent', '#6757c8'));
  const [customPrinters, setCustomPrinters] = useState<PrinterProfile[]>(readStoredPrinters);
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => localStorage.getItem('workspace-printer') ?? printerProfiles[0].id);

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
    root.style.setProperty('--workspace-start', backgroundStart);
    root.style.setProperty('--workspace-end', backgroundEnd);
    root.style.setProperty('--accent-solid', accentColor);
    root.style.setProperty('--color-accent-from', accentColor);
    root.style.setProperty('--color-accent-to', `color-mix(in srgb, ${accentColor} 72%, #ec4899)`);
    localStorage.setItem('workspace-background-start', backgroundStart);
    localStorage.setItem('workspace-background-end', backgroundEnd);
    localStorage.setItem('workspace-accent', accentColor);
  }, [backgroundStart, backgroundEnd, accentColor]);

  useEffect(() => {
    localStorage.setItem('workspace-wallpaper', wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    localStorage.setItem('custom-printers', JSON.stringify(customPrinters));
  }, [customPrinters]);

  useEffect(() => {
    localStorage.setItem('workspace-printer', selectedPrinterId);
  }, [selectedPrinterId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      dark,
      toggleTheme: () => setDark((current) => !current),
      performance,
      togglePerformance: () => setPerformance((current) => !current),
      wallpaper,
      setWallpaper: (next) => {
        setWallpaper(next);
        setBackgroundStart(wallpaperPresets[next].start);
        setBackgroundEnd(wallpaperPresets[next].end);
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
    }),
    [dark, performance, wallpaper, backgroundStart, backgroundEnd, accentColor, activePrinter, printers, selectedPrinterId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
