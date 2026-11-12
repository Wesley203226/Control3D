import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  dark: boolean;
  toggleTheme: () => void;
  performance: boolean;
  togglePerformance: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [performance, setPerformance] = useState<boolean>(() => localStorage.getItem('perf') === '1');

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

  const value = useMemo(
    () => ({
      dark,
      toggleTheme: () => setDark((current) => !current),
      performance,
      togglePerformance: () => setPerformance((current) => !current),
    }),
    [dark, performance],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
