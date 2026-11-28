'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  '/slides/verndly-feature-01-ai-listing-1080-60fps.webm',
  '/slides/verndly-feature-02-import-1080-60fps.webm',
  '/slides/verndly-feature-03-product-cards-1080-60fps.webm',
  '/slides/verndly-feature-04-share-1080-60fps.webm',
  '/slides/verndly-feature-05-buy-now-1080-60fps.webm',
  '/slides/verndly-feature-06-escrow-1080-60fps.webm',
  '/slides/verndly-feature-07-pay-1080-60fps.webm',
  '/slides/verndly-feature-08-verified-sellers-1080-60fps.webm',
  '/slides/verndly-feature-09-delivery-1080-60fps.webm',
  '/slides/verndly-feature-10-seller-hub-1080-60fps.webm',
  '/slides/verndly-feature-11-categories-1080-60fps.webm',
  '/slides/verndly-feature-12-support-1080-60fps.webm',
] as const;

const STACK = 3;
const EASE = [0.22, 1, 0.36, 1] as const;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function SlideCard({
  src,
  active,
  reducedMotion,
  onEnded,
  onProgress,
  onAspect,
}: {
  src: string;
  active: boolean;
  reducedMotion: boolean;
  onEnded: () => void;
  onProgress: (value: number) => void;
  onAspect: (ratio: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;

    if (!active || reducedMotion) {
      video.pause();
      return;
    }

    const play = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      video.currentTime = 0;
      video.play().catch(() => undefined);
    };

    play();

    let frame = 0;
    const tick = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        onProgress(Math.min(1, video.currentTime / video.duration));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', play);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', play);
    };
  }, [active, reducedMotion, src, onProgress]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload={active ? 'auto' : 'metadata'}
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          onAspect(video.videoWidth / video.videoHeight);
        }
      }}
      onEnded={() => {
        if (active && !reducedMotion) onEnded();
      }}
      onError={() => {
        if (active) onEnded();
      }}
      onContextMenu={(event) => event.preventDefault()}
      className="h-full w-full border-0 bg-transparent object-cover outline-none"
    />
  );
}

export default function AuthVideoPanel() {
  const isDesktop = useIsDesktop();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const go = useCallback((step: 1 | -1) => {
    setProgress(0);
    setIndex((current) => (current + step + SLIDES.length) % SLIDES.length);
  }, []);

  const layers = Array.from({ length: STACK }, (_, depth) => ({
    depth,
    slide: (index + depth) % SLIDES.length,
  }));

  const wide = aspect >= 1;
  const cardWidth = wide ? 'min(520px, 72%)' : 'min(340px, 58%)';

  return (
    <aside className="bg-background relative hidden h-screen flex-1 select-none lg:sticky lg:top-0 lg:flex lg:flex-col lg:items-start lg:justify-center lg:pl-8 lg:pr-12">
      {isDesktop && (
        <div className="flex w-full flex-col items-start">
          <div className="relative" style={{ width: cardWidth }}>
            <div className="relative" style={{ aspectRatio: aspect }}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
                style={{
                  background:
                    'radial-gradient(circle, #ef4444 0%, #fb7185 46%, rgba(23,23,23,0.35) 72%, transparent 80%)',
                  opacity: 0.55,
                }}
              />
              <AnimatePresence initial={false}>
                {layers.map(({ depth, slide }) => (
                  <motion.div
                    key={slide}
                    initial={
                      depth === 0
                        ? { scale: 0.92, y: 36, opacity: 0 }
                        : { scale: 0.88, y: 52, opacity: 0 }
                    }
                    animate={{
                      scale: 1,
                      y: depth * 22,
                      opacity: 1,
                      zIndex: 30 - depth * 10,
                    }}
                    exit={{
                      scale: 0.9,
                      y: 72,
                      opacity: 0.4,
                      zIndex: 0,
                      transition: { duration: reducedMotion ? 0 : 0.48, ease: EASE },
                    }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 280, damping: 32, mass: 0.85 }
                    }
                    className="absolute inset-0 overflow-hidden rounded-[28px] border-0 bg-transparent shadow-none outline-none ring-0"
                    style={{ zIndex: 30 - depth * 10, transformOrigin: 'center bottom' }}
                  >
                    <SlideCard
                      src={SLIDES[slide]}
                      active={depth === 0}
                      reducedMotion={reducedMotion}
                      onEnded={() => go(1)}
                      onProgress={setProgress}
                      onAspect={(ratio) =>
                        setAspect((current) => (Math.abs(current - ratio) < 0.01 ? current : ratio))
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div
              className="relative z-40 mt-14 flex items-center justify-center gap-1"
              role="group"
              aria-label="Feature slides"
            >
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous slide"
                className="group grid h-8 w-8 place-items-center rounded-full"
              >
                <span className="bg-foreground/30 group-hover:bg-foreground/80 h-2 w-2 rounded-full transition-colors" />
              </button>
              <div
                className="bg-foreground/15 relative h-2 w-10 overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[var(--color-accent)]"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next slide"
                className="group grid h-8 w-8 place-items-center rounded-full"
              >
                <span className="bg-foreground/30 group-hover:bg-foreground/80 h-2 w-2 rounded-full transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
