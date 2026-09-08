'use client';

import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/lib/contexts/theme';

export default function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className:
          '!border !border-border/80 !shadow-lg !rounded-2xl !p-4 !font-sans !text-xs sm:!text-sm',
        classNames: {
          actionButton:
            '!rounded-xl !text-xs !font-semibold !px-3.5 !py-2 !bg-secondary !text-white active:!scale-95 !transition-transform !duration-150',
          cancelButton:
            '!rounded-xl !text-xs !font-medium !px-3.5 !py-2 !bg-surface !text-foreground/80 hover:!text-foreground active:!scale-95 !transition-transform !duration-150',
          closeButton:
            '!border-0 !bg-surface/80 hover:!bg-surface !text-foreground/60 hover:!text-foreground !rounded-lg active:!scale-90 !transition-all',
        },
      }}
    />
  );
}
