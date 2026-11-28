'use client';

import React, { useEffect, useState } from 'react';
import VerndlyAiIcon from './VerndlyAiIcon';

const DEFAULT_STATUS_MESSAGES = [
  'Understanding what you’re looking for…',
  'Searching verified Ghana stores…',
  'Putting your best matches together…',
];

/**
 * Smooth Verndly AI working indicator pairing a live kinetic typing status
 * notification with the shimmer reply & product card skeleton underneath,
 * so shoppers always see what Verndly AI is doing while results load.
 */
export default function AiReplySkeleton({
  cards = 4,
  showCards = true,
  messages = DEFAULT_STATUS_MESSAGES,
}: {
  cards?: number;
  showCards?: boolean;
  messages?: string[];
}) {
  const safeMessages = messages.length > 0 ? messages : DEFAULT_STATUS_MESSAGES;
  const [msgIndex, setMsgIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'clearing'>('typing');

  const activeMessage = safeMessages[msgIndex % safeMessages.length];

  useEffect(() => {
    if (phase === 'typing') {
      if (typedLength < activeMessage.length) {
        const nextChar = activeMessage[typedLength];
        const delay =
          nextChar === ',' || nextChar === '.' || nextChar === '…'
            ? 80
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
      }, 150);
      return () => clearTimeout(clearTimer);
    }

    if (typedLength > 0) {
      const eraseTimer = setTimeout(() => {
        setTypedLength((len) => Math.max(0, len - 3));
      }, 16);
      return () => clearTimeout(eraseTimer);
    }

    const nextTimer = setTimeout(() => {
      setMsgIndex((prev) => (prev + 1) % safeMessages.length);
      setPhase('typing');
    }, 100);
    return () => clearTimeout(nextTimer);
  }, [phase, typedLength, activeMessage, safeMessages.length]);

  const visibleChars = Array.from(activeMessage).slice(0, typedLength);

  return (
    <div role="status" aria-live="polite" className="space-y-3">
      {/* Live Kinetic Operation Status Header */}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <VerndlyAiIcon size={22} mood="working" />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="verndly-pill-pop bg-surface dark:bg-foreground/[0.08] inline-flex min-h-[34px] max-w-full items-center gap-2 rounded-full px-3.5 py-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-700"
              aria-hidden="true"
            />
            <span className="text-foreground text-left text-xs font-medium leading-snug tracking-[-0.01em]">
              {visibleChars.map((ch, idx) => (
                <span key={`${msgIndex}-${idx}`} className="verndly-char-in">
                  {ch}
                </span>
              ))}
              <span
                aria-hidden="true"
                className="verndly-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] rounded-full bg-red-700"
              />
            </span>
          </div>

          {/* Smooth Shimmer Summary Lines */}
          <div className="space-y-2 pl-0.5" aria-hidden="true">
            <div
              className="verndly-skel h-2.5 w-[86%] rounded-full"
              style={{ animationDelay: '70ms' }}
            />
            <div
              className="verndly-skel h-2.5 w-[58%] rounded-full"
              style={{ animationDelay: '150ms' }}
            />
          </div>
        </div>
      </div>

      {/* Smooth Shimmer Product Cards */}
      {showCards && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:pl-7" aria-hidden="true">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl p-1.5">
              <div
                className="verndly-skel h-14 w-14 shrink-0 rounded-xl"
                style={{ animationDelay: `${220 + index * 80}ms` }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div
                  className="verndly-skel h-2.5 w-4/5 rounded-full"
                  style={{ animationDelay: `${260 + index * 80}ms` }}
                />
                <div
                  className="verndly-skel h-2.5 w-2/5 rounded-full"
                  style={{ animationDelay: `${300 + index * 80}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
