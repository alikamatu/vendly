'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Full-height right-screen video panel for the auth layout.
 *
 * Performance:
 * - Mounted only on desktop (≥1024px) so mobile devices never download video bytes.
 * - Stripped audio track (-an) + faststart H.264 MP4 & VP9 WebM.
 * - Instant poster image with smooth cross-fade on canplay.
 * - Pauses when the tab is hidden or prefers-reduced-motion is enabled.
 */
const POSTER = '/videos/auth-showcase-poster.jpg';
const SOURCES = [
  { src: '/videos/auth-showcase.webm', type: 'video/webm' },
  { src: '/videos/auth-showcase.mp4', type: 'video/mp4' },
];

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

export default function AuthVideoPanel() {
  const isDesktop = useIsDesktop();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      if (document.hidden || reduceMotion.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    reduceMotion.addEventListener('change', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      reduceMotion.removeEventListener('change', sync);
    };
  }, [isDesktop]);

  return (
    <aside
      aria-hidden="true"
      className="relative hidden h-screen flex-1 select-none overflow-hidden bg-neutral-950 lg:sticky lg:top-0 lg:block"
    >
      {/* Poster — paints immediately */}
      <img
        src={POSTER}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {isDesktop && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
          poster={POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      )}
    </aside>
  );
}
