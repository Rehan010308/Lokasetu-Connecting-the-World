'use client';

import React from 'react';

type Mode = 'light' | 'dark' | 'system';

const KEY = 'lokasetu:theme';
const Ctx = React.createContext<{ mode: Mode; resolved: 'light' | 'dark'; setMode: (m: Mode) => void }>({
  mode: 'system', resolved: 'light', setMode: () => {},
});

/**
 * Adaptive theming. Follows the OS by default — a worker who has set their
 * phone to dark for battery reasons should not be blasted with white at 6am.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<Mode>('system');
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const stored = (window.localStorage.getItem(KEY) as Mode | null) ?? 'system';
    setModeState(stored);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode;
      setResolved(next);
      document.documentElement.setAttribute('data-theme', next);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const setMode = React.useCallback((m: Mode) => {
    setModeState(m);
    try { window.localStorage.setItem(KEY, m); } catch {}
  }, []);

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return React.useContext(Ctx);
}

export function ThemeToggle() {
  const { resolved, setMode } = useTheme();
  return (
    <button
      className="icon-btn"
      aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
    >
      {resolved === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
