'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Share,
  PlusSquare,
  Sparkles,
  Zap,
  ShoppingBag,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'vendly_pwa_dismissed_until';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // 1. Service Worker Registration & Environment Detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // Detect standalone mode (already installed & running as PWA)
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;

    queueMicrotask(() => {
      setIsStandalone(standaloneMode);
      if (!standaloneMode) {
        setIsIOS(isIosDevice);
      }
    });

    if (standaloneMode) return;

    // Listen for beforeinstallprompt (Chromium / Android / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if dismissed recently
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      const isCooldownActive = dismissedUntil && Date.now() < Number(dismissedUntil);

      if (!isCooldownActive && !standaloneMode) {
        // Auto-show prompt after 2 seconds on new browser open
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      toast.success('Vendly has been added to your home screen!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Auto-prompt on iOS Safari if not standalone and not dismissed
    if (isIosDevice && !standaloneMode) {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      const isCooldownActive = dismissedUntil && Date.now() < Number(dismissedUntil);
      if (!isCooldownActive) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }

    // Custom event listener so other parts of the app can open the install prompt
    const handleOpenPwaPrompt = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-pwa-install', handleOpenPwaPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleOpenPwaPrompt);
    };
  }, []);

  // Handle native install trigger
  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS doesn't have an automated prompt API, keep modal open showing the step instructions
      return;
    }

    if (!deferredPrompt) {
      toast.info('To install Vendly, tap your browser menu (⋮) and select "Add to Home Screen"');
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        toast.success('Installing Vendly to your device...');
        setIsInstalled(true);
        setIsOpen(false);
      } else {
        // User clicked cancel on native dialog
        handleDismiss();
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    // Set 24h snooze
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
  }, []);

  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onTap={handleDismiss}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal Card / Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-2xl sm:p-6 dark:border-zinc-800 dark:bg-[#18181b]"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>

            {/* App Header & Icon */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 shadow-md ring-2 ring-amber-500/30">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Vendly Icon"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Official Web App
                  </span>
                  <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Install Vendly on your Screen
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              Get 1-tap instant access, faster browsing, and full-screen shopping without using app
              store storage.
            </p>

            {/* Feature Highlights */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <div className="flex flex-col items-center text-center">
                <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                  Instant
                </span>
                <span className="text-[10px] text-zinc-400">Loads faster</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                  1-Tap
                </span>
                <span className="text-[10px] text-zinc-400">Fast checkout</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                  Lightweight
                </span>
                <span className="text-[10px] text-zinc-400">Zero storage</span>
              </div>
            </div>

            {/* iOS Safari Guide vs Standard 1-Click Install */}
            {isIOS ? (
              <div className="space-y-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs dark:bg-amber-500/10">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                  <Sparkles className="h-4 w-4" />
                  <span>How to add on iPhone / iPad:</span>
                </div>
                <ol className="space-y-1.5 pl-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      1
                    </span>
                    <span>
                      Tap the{' '}
                      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Share
                      </strong>{' '}
                      icon at the bottom of Safari (
                      <Share className="inline h-3.5 w-3.5 text-blue-500" />)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      2
                    </span>
                    <span>
                      Scroll down and tap{' '}
                      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Add to Home Screen
                      </strong>{' '}
                      (
                      <PlusSquare className="inline h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                      )
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      3
                    </span>
                    <span>
                      Tap{' '}
                      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Add
                      </strong>{' '}
                      in the top right corner.
                    </span>
                  </li>
                </ol>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Not Now
              </button>

              {!isIOS ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="inline-flex flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>{isInstalling ? 'Installing...' : 'Install App Now'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Got it!</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
