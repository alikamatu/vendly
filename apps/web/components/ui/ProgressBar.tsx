'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from '@/utils/clsx';

interface ProgressBarProps {
  /** 0-100 for determinate, omit for indeterminate */
  value?: number;
  className?: string;
}

export default function ProgressBar({ value, className }: ProgressBarProps) {
  const isIndeterminate = value === undefined;

  return (
    <div className={clsx('h-1 w-full overflow-hidden rounded-full bg-foreground/10', className)}>
      {isIndeterminate ? (
        <motion.div
          className="h-full w-1/3 rounded-full bg-accent"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
