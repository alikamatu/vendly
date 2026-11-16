import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

import { jsonStorage } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (next: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'vendly_theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    jsonStorage.get<ThemeMode>(STORAGE_KEY, 'light').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  useEffect(() => {
    try {
      setColorScheme(mode);
      if (mode !== 'system') {
        Appearance.setColorScheme?.(mode);
      } else {
        Appearance.setColorScheme?.('unspecified' as any);
      }
    } catch {
      // ignore if unsupported in current runtime
    }
  }, [mode, setColorScheme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void jsonStorage.set(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: 'light' as ThemeMode,
      isDark: false,
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
