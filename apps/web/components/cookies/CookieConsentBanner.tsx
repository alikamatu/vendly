'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Sparkles, X } from 'lucide-react';
import {
  getCookieConsent,
  setCookieConsent,
  CONSENT_UPDATED_EVENT,
} from '@/lib/cookies/shopping-habits';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      setVisible(getCookieConsent() === null);
    };
    // Small delay so initial page paint feels effortless
    const timer = window.setTimeout(check, 900);
    window.addEventListener(CONSENT_UPDATED_EVENT, check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CONSENT_UPDATED_EVENT, check);
    };
  }, []);

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md sm:left-5 sm:right-auto sm:mx-0"
    >
      <div className="bg-background/95 border-border/80 rounded-3xl border p-4 shadow-2xl backdrop-blur-md sm:p-5">
        <div className="flex items-start gap-3">
          <div className="bg-surface text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-foreground text-xs font-semibold sm:text-sm">
                Personalize your Verndly picks
              </p>
              <button
                type="button"
                aria-label="Dismiss cookie notice"
                onClick={() => {
                  setCookieConsent('accepted');
                  setVisible(false);
                }}
                className="text-muted hover:text-foreground -mr-1 -mt-1 rounded-lg p-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-muted text-[11px] leading-relaxed">
              We use lightweight cookies to remember your shopping interests (categories, brands,
              and searches) so we can surface tailored picks for you.{' '}
              <Link href="/privacy" className="text-foreground underline underline-offset-2">
                Privacy policy
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCookieConsent('essential');
              setVisible(false);
            }}
            className="bg-surface text-muted hover:text-foreground h-9 rounded-full px-3.5 text-[11px] font-medium transition-colors"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => {
              setCookieConsent('accepted');
              setVisible(false);
            }}
            className="bg-foreground text-background inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[11px] font-semibold transition-opacity hover:opacity-90"
          >
            Accept personalization
          </button>
        </div>
      </div>
    </aside>
  );
}
