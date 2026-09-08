'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from '@/utils/clsx';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
  menuWidth?: number;
}

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className,
  menuWidth = 190,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    placement: 'bottom' | 'top';
  }>({
    placement: 'bottom',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 6;
    const padding = 12;

    // Approximate menu height based on number of items + dividers
    const approxHeight = items.length * 36 + items.filter((i) => i.divider).length * 10 + 20;

    const spaceBelow = viewportHeight - rect.bottom;
    const placeAbove = spaceBelow < approxHeight && rect.top > approxHeight;

    let nextCoords: typeof coords;

    if (placeAbove) {
      nextCoords = {
        bottom: viewportHeight - rect.top + margin,
        placement: 'top',
      };
    } else {
      nextCoords = {
        top: rect.bottom + margin,
        placement: 'bottom',
      };
    }

    if (align === 'right') {
      const right = Math.max(padding, viewportWidth - rect.right);
      nextCoords.right = right;
    } else {
      const left = Math.max(padding, Math.min(rect.left, viewportWidth - menuWidth - padding));
      nextCoords.left = left;
    }

    setCoords(nextCoords);
  }, [align, items, menuWidth]);

  // Recalculate position on open, scroll, resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={clsx('relative inline-block text-left', className)} ref={triggerRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="cursor-pointer inline-flex items-center"
      >
        {trigger}
      </div>

      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <MotionDiv
                ref={menuRef}
                initial={{
                  opacity: 0,
                  scale: 0.96,
                  y: coords.placement === 'top' ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: coords.placement === 'top' ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top !== undefined ? `${coords.top}px` : undefined,
                  bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                  left: coords.left !== undefined ? `${coords.left}px` : undefined,
                  right: coords.right !== undefined ? `${coords.right}px` : undefined,
                  width: `${menuWidth}px`,
                }}
                className={clsx(
                  'z-[9999] rounded-2xl bg-background dark:bg-[#141414] p-1.5',
                  'border border-border/80 dark:border-white/10 shadow-lg',
                  'focus:outline-none select-none'
                )}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {item.divider && (
                      <div className="my-1 h-px bg-border/60 dark:bg-white/10" />
                    )}
                    <MotionButton
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={item.disabled}
                      onClick={() => {
                        item.onClick();
                        setIsOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors outline-none select-none',
                        item.variant === 'danger'
                          ? 'text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15'
                          : 'text-foreground/80 hover:text-foreground hover:bg-surface',
                        item.disabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </MotionButton>
                  </React.Fragment>
                ))}
              </MotionDiv>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
