'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmModal, type ConfirmVariant } from '@/components/ui/confirm-modal';

export interface ConfirmOptions {
  title?: string;
  description?: React.ReactNode;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?:
    | 'trash'
    | 'alert'
    | 'warning'
    | 'info'
    | 'check'
    | React.ComponentType<{ className?: string }>;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export interface AlertOptions {
  title?: string;
  description?: React.ReactNode;
  details?: React.ReactNode;
  buttonText?: string;
  variant?: ConfirmVariant;
  icon?:
    | 'trash'
    | 'alert'
    | 'warning'
    | 'info'
    | 'check'
    | React.ComponentType<{ className?: string }>;
  maxWidth?: 'sm' | 'md' | 'lg';
}

interface DialogState {
  isOpen: boolean;
  isAlert: boolean;
  title: string;
  description?: React.ReactNode;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant: ConfirmVariant;
  icon?:
    | 'trash'
    | 'alert'
    | 'warning'
    | 'info'
    | 'check'
    | React.ComponentType<{ className?: string }>;
  maxWidth?: 'sm' | 'md' | 'lg';
}

interface ConfirmContextType {
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
  alert: (options: string | AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    isAlert: false,
    title: '',
    variant: 'danger',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // If there's an existing dialog, resolve it as false first
      if (resolverRef.current) {
        resolverRef.current(false);
      }

      resolverRef.current = resolve;

      if (typeof options === 'string') {
        setDialogState({
          isOpen: true,
          isAlert: false,
          title: 'Confirm Action',
          description: options,
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          variant: 'danger',
        });
      } else {
        setDialogState({
          isOpen: true,
          isAlert: false,
          title: options.title || 'Confirm Action',
          description: options.description,
          details: options.details,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'danger',
          icon: options.icon,
          maxWidth: options.maxWidth,
        });
      }
    });
  }, []);

  const alert = useCallback((options: string | AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }

      resolverRef.current = () => resolve();

      if (typeof options === 'string') {
        setDialogState({
          isOpen: true,
          isAlert: true,
          title: 'Notice',
          description: options,
          confirmText: 'Understood',
          variant: 'info',
        });
      } else {
        setDialogState({
          isOpen: true,
          isAlert: true,
          title: options.title || 'Notice',
          description: options.description,
          details: options.details,
          confirmText: options.buttonText || 'Understood',
          variant: options.variant || 'info',
          icon: options.icon,
          maxWidth: options.maxWidth,
        });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogState.title}
        description={dialogState.description}
        details={dialogState.details}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        icon={dialogState.icon}
        isAlert={dialogState.isAlert}
        maxWidth={dialogState.maxWidth}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
