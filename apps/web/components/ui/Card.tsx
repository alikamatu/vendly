'use client';

import React from 'react';
import clsx from '@/utils/clsx';
import { motion } from 'framer-motion';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  bordered?: boolean;
  shadowless?: boolean;
}

function Card({
  children,
  className,
  hoverEffect = false,
  bordered = false,
  shadowless = true,
  ...props
}: CardProps) {
  const hasOverflowClass =
    Boolean(className) && /\boverflow-(hidden|visible|auto|scroll)\b/.test(className!);

  return (
    <motion.div
      whileHover={hoverEffect ? { y: -2, scale: 1.002 } : undefined}
      whileTap={hoverEffect ? { scale: 0.998 } : undefined}
      transition={{ duration: 0.2 }}
      className={clsx(
        'rounded-[2rem] transition-all duration-300',
        !hasOverflowClass && 'overflow-hidden',
        bordered ? 'border-border/50 border' : 'border-0',
        shadowless ? 'shadow-none' : 'shadow-xs',
        hoverEffect &&
          !shadowless &&
          'hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20',
        className,
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export default Card;
