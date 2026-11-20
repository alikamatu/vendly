import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { jsonStorage } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
}

const STORAGE_KEY = 'vendly_theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useNativeWindColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    jsonStorage.get<string>(STORAGE_KEY, 'light').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setModeState(saved);
      }
    });
  }, []);

  const isDark = mode === 'dark';

  useEffect(() => {
    try {
      setColorScheme(mode);
      Appearance.setColorScheme?.(mode);
    } catch {
      // ignore if unsupported in current runtime
    }
  }, [mode, setColorScheme]);

  const applyMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void jsonStorage.set(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    applyMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, applyMode]);

  const value = useMemo(() => ({ mode, isDark, toggle }), [mode, isDark, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: 'light' as ThemeMode,
      isDark: false,
      toggle: () => {},
    };
  }
  return ctx;
}
