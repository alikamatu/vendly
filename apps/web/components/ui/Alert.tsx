'use client';

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const glyphTone: Record<AlertVariant, { ink: string; wash: string }> = {
  success: { ink: '#1f8a4c', wash: 'rgba(31, 138, 76, 0.12)' },
  error: { ink: '#d12626', wash: 'rgba(209, 38, 38, 0.12)' },
  warning: { ink: '#b86e00', wash: 'rgba(184, 110, 0, 0.14)' },
  info: { ink: '#3a3a3a', wash: 'rgba(0, 0, 0, 0.06)' },
};

export function AlertGlyph({ variant = 'info' }: { variant?: AlertVariant }) {
  const tone = glyphTone[variant];
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={`verndly-alert-mark verndly-alert-mark-${variant}`}
    >
      <rect width="28" height="28" rx="9" fill={tone.wash} />
      {variant === 'success' && (
        <path
          d="M8.5 14.2 12.1 17.7 19.5 10.2"
          fill="none"
          stroke={tone.ink}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {variant === 'error' && (
        <path
          d="M10 10 18 18 M18 10 10 18"
          fill="none"
          stroke={tone.ink}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
      {variant === 'warning' && (
        <path
          d="M14 8.5 v7 M14 18.8 v.6"
          fill="none"
          stroke={tone.ink}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
      {variant === 'info' && (
        <path
          d="M14 12.2 v6.2 M14 9.2 v.6"
          fill="none"
          stroke={tone.ink}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const showToast = {
  success: toast.success,
  error: toast.error,
  warning: toast.warning,
  info: toast.info,
} as const;

export default function Alert({ variant = 'info', title, message, onDismiss }: AlertProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    let active = true;
    const id = showToast[variant](title || message, {
      description: title ? message : undefined,
      duration: 4200,
      onDismiss: () => {
        if (active) onDismissRef.current?.();
      },
      onAutoClose: () => {
        if (active) onDismissRef.current?.();
      },
    });
    return () => {
      active = false;
      toast.dismiss(id);
    };
  }, [variant, title, message]);

  return null;
}
