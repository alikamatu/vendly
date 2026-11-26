'use client';

import React, { useEffect, useRef, useState } from 'react';
import Portal from '@/components/common/Portal';
import VerndlyAiIcon from './VerndlyAiIcon';

export interface VerndlyAiOverlayProps {
  /** Controls visibility of the full-screen centered AI working state */
  isOpen: boolean;
  /** Rotating step-by-step messages explaining what Verndly AI is doing */
  messages?: string[];
  /** Kept optional for caller compatibility; minimal UI shows avatar + white motion pill */
  subtitle?: string;
}

const DEFAULT_MESSAGES = [
  'Looking closely at your request…',
  'Finding the best matches on Verndly…',
  'Putting everything together…',
];

/**
 * Modern, ultra-minimal centered Verndly AI working state:
 * - Clean dimmed backdrop (no blur, borders, or shadows)
 * - Floating expressive 3D-styled `red-700` Verndly AI avatar
 * - Crisp pure-white pill with buttery character-by-character typing motion
 *   and a soft breathing red-700 caret so Verndly AI feels genuinely alive.
 */
export default function VerndlyAiOverlay({
  isOpen,
  messages = DEFAULT_MESSAGES,
}: VerndlyAiOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'clearing'>('typing');
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);
  const wasOpenRef = useRef(false);
  const safeMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES;

  // Manage smooth CSS fade-in and guaranteed unmount on close
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const raf = requestAnimationFrame(() => {
        setVisible(true);
        setExiting(false);
        setMsgIndex(0);
        setTypedLength(0);
        setPhase('typing');
      });
      return () => cancelAnimationFrame(raf);
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;

    const hideRaf = requestAnimationFrame(() => {
      setVisible(false);
      setExiting(true);
    });
    const unmountTimer = setTimeout(() => {
      setExiting(false);
      setMsgIndex(0);
      setTypedLength(0);
      setPhase('typing');
    }, 220);

    return () => {
      cancelAnimationFrame(hideRaf);
      clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  const activeMessage = safeMessages[msgIndex % safeMessages.length];

  // Smooth conversational typing -> brief hold -> crisp backspace -> next message
  useEffect(() => {
    if (!isOpen) return;

    if (phase === 'typing') {
      if (typedLength < activeMessage.length) {
        const nextChar = activeMessage[typedLength];
        const delay =
          nextChar === ',' || nextChar === '.' || nextChar === '…'
            ? 85
            : nextChar === ' '
              ? 18
              : 24;
        const t = setTimeout(() => {
          setTypedLength((len) => len + 1);
        }, delay);
        return () => clearTimeout(t);
      }

      if (safeMessages.length <= 1) return;
      const holdTimer = setTimeout(() => {
        setPhase('holding');
      }, 1150);
      return () => clearTimeout(holdTimer);
    }

    if (phase === 'holding') {
      const clearTimer = setTimeout(() => {
        setPhase('clearing');
      }, 160);
      return () => clearTimeout(clearTimer);
    }

    // phase === 'clearing'
    if (typedLength > 0) {
      const eraseTimer = setTimeout(() => {
        setTypedLength((len) => Math.max(0, len - 3));
      }, 16);
      return () => clearTimeout(eraseTimer);
    }

    const nextTimer = setTimeout(() => {
      setMsgIndex((prev) => (prev + 1) % safeMessages.length);
      setPhase('typing');
    }, 110);
    return () => clearTimeout(nextTimer);
  }, [isOpen, phase, typedLength, activeMessage, safeMessages.length]);

  // Lock page scroll strictly while open and always restore on close
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen && !exiting) {
    return null;
  }

  const visibleChars = Array.from(activeMessage).slice(0, typedLength);

  return (
    <Portal>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-[130] flex select-none flex-col items-center justify-center bg-black/55 px-6 text-center transition-opacity duration-200 ${
          isOpen && visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-5">
          {/* Floating expressive Verndly AI Avatar */}
          <div
            className={`verndly-orb-float transition-transform duration-300 ${
              isOpen && visible ? 'scale-100' : 'scale-90'
            }`}
          >
            <VerndlyAiIcon size={86} mood="working" />
          </div>

          {/* Pure-White Live Typing Pill */}
          <div role="status" aria-live="polite" className="max-w-[min(90vw,420px)]">
            <div className="verndly-pill-pop inline-flex min-h-[42px] items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-neutral-950 transition-all duration-200">
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-700"
                aria-hidden="true"
              />
              <span className="text-left text-[13px] font-semibold leading-snug tracking-[-0.02em] sm:text-sm">
                {visibleChars.map((ch, idx) => (
                  <span key={`${msgIndex}-${idx}`} className="verndly-char-in">
                    {ch}
                  </span>
                ))}
                <span
                  aria-hidden="true"
                  className="verndly-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] rounded-full bg-red-700"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
