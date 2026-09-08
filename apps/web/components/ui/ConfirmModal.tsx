'use client';

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import clsx from '@/utils/clsx';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    confirmButtonVariant: 'primary' | 'danger' | 'secondary';
  }
> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10',
    confirmButtonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    confirmButtonVariant: 'primary',
  },
  info: {
    icon: Info,
    iconColor: 'text-secondary',
    iconBg: 'bg-secondary/10',
    confirmButtonVariant: 'primary',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    confirmButtonVariant: 'primary',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={!isLoading} className="sm:max-w-[420px]">
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        {/* Icon Badge */}
        <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs', config.iconBg, config.iconColor)}>
          <Icon className="w-7 h-7" strokeWidth={2.2} />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Responsive Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-medium"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={config.confirmButtonVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
            loadingText="Processing..."
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-medium"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
