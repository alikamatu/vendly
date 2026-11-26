'use client';

import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { AlertGlyph, type AlertVariant } from '@/components/ui/Alert';

const icon = (variant: AlertVariant) => <AlertGlyph variant={variant} />;

export default function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-center"
      offset={14}
      gap={8}
      visibleToasts={3}
      duration={4200}
      closeButton={false}
      icons={{
        success: icon('success'),
        error: icon('error'),
        warning: icon('warning'),
        info: icon('info'),
        loading: icon('info'),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'verndly-alert',
          title: 'verndly-alert-title',
          description: 'verndly-alert-desc',
          content: 'verndly-alert-copy',
          icon: 'verndly-alert-glyph',
        },
      }}
    />
  );
}
