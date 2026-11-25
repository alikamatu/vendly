'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Portal from '@/components/common/Portal';
import VerndlyAiIcon from './VerndlyAiIcon';

export interface VerndlyAiOverlayProps {
  /** Controls visibility of the full-screen centered AI working state */
  isOpen: boolean;
  /** Rotating step-by-step messages explaining what Verndly AI is doing */
  messages?: string[];
  /** Optional subtitle shown beneath the active status message */
  subtitle?: string;
}

const DEFAULT_MESSAGES = [
  'Looking closely at your photos…',
  'Distinguishing items and matching angles…',
  'Writing clean titles, descriptions, and categories…',
];

const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen centered Verndly AI working state:
 * - Softly fading radial background (no CSS blur, borders, or shadows)
 * - Floating, expressive 3D-styled `red-700` Verndly AI orb in the center
 * - Smoothly cycling status messages telling the user what Verndly AI is doing
 */
export default function VerndlyAiOverlay({
  isOpen,
  messages = DEFAULT_MESSAGES,
  subtitle,
}: VerndlyAiOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const safeMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES;

  // Cycle through status messages while open
  useEffect(() => {
    if (!isOpen || safeMessages.length <= 1) return;
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % safeMessages.length);
    }, 2300);
    return () => clearInterval(timer);
  }, [isOpen, safeMessages.length]);

  // Lock page scroll while overlay is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const activeMessage = safeMessages[msgIndex % safeMessages.length];

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="verndly-ai-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE_SMOOTH }}
            style={{
              background:
                'radial-gradient(circle at 50% 46%, rgba(10, 10, 12, 0.88) 0%, rgba(10, 10, 12, 0.74) 52%, rgba(10, 10, 12, 0.56) 100%)',
            }}
            className="fixed inset-0 z-[130] flex select-none flex-col items-center justify-center px-6 text-center"
          >
            {/* Moving Centerpiece Character + Fading Ambient Pulse Rings */}
            <div className="relative flex h-36 w-36 items-center justify-center">
              <motion.span
                animate={{ scale: [0.85, 1.6], opacity: [0.28, 0] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="pointer-events-none absolute h-24 w-24 rounded-full bg-red-700"
              />
              <motion.span
                animate={{ scale: [0.85, 1.4], opacity: [0.2, 0] }}
                transition={{
                  duration: 2.4,
                  delay: 0.9,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="pointer-events-none absolute h-24 w-24 rounded-full bg-red-700"
              />

              <motion.div
                initial={{ scale: 0.78, y: 12, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: [0, -8, 0],
                  rotate: [-2, 2, -2],
                }}
                exit={{ scale: 0.85, y: 8, opacity: 0 }}
                transition={{
                  scale: { duration: 0.35, ease: EASE_SMOOTH },
                  opacity: { duration: 0.25 },
                  y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                  rotate: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="relative z-10"
              >
                <VerndlyAiIcon size={92} mood="working" />
              </motion.div>
            </div>

            {/* Brand Name & Live Step-by-Step Messaging */}
            <div role="status" aria-live="polite" className="mt-4 max-w-sm space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400">
                Verndly AI
              </p>

              <div className="flex min-h-[52px] items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeMessage}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: EASE_SMOOTH }}
                    className="text-base font-semibold leading-snug text-white sm:text-lg"
                  >
                    {activeMessage}
                  </motion.p>
                </AnimatePresence>
              </div>

              {subtitle && <p className="text-xs leading-relaxed text-white/65">{subtitle}</p>}

              {/* Subtle animated step dots */}
              {safeMessages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {safeMessages.map((_, idx) => {
                    const active = idx === msgIndex % safeMessages.length;
                    return (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          active ? 'w-5 bg-red-600' : 'w-1.5 bg-white/25'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
