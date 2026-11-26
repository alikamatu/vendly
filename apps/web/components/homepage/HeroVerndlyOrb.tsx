'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface HeroPose {
  gx: number;
  gy: number;
  tilt: number;
  openY: number;
}

const REST_POSE: HeroPose = { gx: 0.42, gy: -0.34, tilt: -16, openY: 1 };

const AUTONOMOUS_SEQUENCE: Array<{ pose: HeroPose; duration: number }> = [
  { pose: REST_POSE, duration: 2600 },
  { pose: { ...REST_POSE, openY: 0.08 }, duration: 130 },
  { pose: REST_POSE, duration: 1900 },
  { pose: { gx: -0.44, gy: -0.22, tilt: 14, openY: 1 }, duration: 1700 },
  { pose: { gx: 0, gy: -0.06, tilt: 0, openY: 1 }, duration: 1500 },
  { pose: { gx: 0, gy: -0.06, tilt: 0, openY: 0.08 }, duration: 120 },
  { pose: { gx: 0.24, gy: 0.14, tilt: -8, openY: 1 }, duration: 1400 },
];

const EYE_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 24,
  mass: 0.8,
};

interface HeroVerndlyOrbProps {
  onClick?: () => void;
  isTypingPrompt?: boolean;
}

/**
 * Monumental interactive Verndly AI avatar:
 * - Pure, crisp `red-700` sphere (#dc2626 -> #b91c1c -> #7f1d1d)
 * - Two expressive dark capsule eyes (#120a0a) with 3D spherical foreshortening
 * - Smooth cursor gaze tracking on desktop + autonomous gaze & blink choreography
 * - Strictly NO mouth, NO rounded halo rings, NO borders, NO shadows
 */
export default function HeroVerndlyOrb({ onClick, isTypingPrompt = false }: HeroVerndlyOrbProps) {
  const uid = useId().replace(/:/g, '');
  const sphereGradId = `hero-verndly-sphere-${uid}`;
  const rimGradId = `hero-verndly-rim-${uid}`;
  const sheenGradId = `hero-verndly-sheen-${uid}`;
  const clipId = `hero-verndly-clip-${uid}`;

  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [pointerGaze, setPointerGaze] = useState<{ gx: number; gy: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Autonomous idle gaze & blink cycle
  useEffect(() => {
    const current = AUTONOMOUS_SEQUENCE[stepIdx % AUTONOMOUS_SEQUENCE.length];
    const timer = window.setTimeout(() => {
      setStepIdx((prev) => (prev + 1) % AUTONOMOUS_SEQUENCE.length);
    }, current.duration);
    return () => window.clearTimeout(timer);
  }, [stepIdx]);

  // Window-wide cursor tracking so Verndly AI feels attentive and alive
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / Math.max(window.innerWidth * 0.45, 260);
      const dy = (e.clientY - cy) / Math.max(window.innerHeight * 0.45, 260);
      setPointerGaze({
        gx: Math.max(-0.78, Math.min(0.78, dx)),
        gy: Math.max(-0.68, Math.min(0.68, dy)),
      });
    };

    const handleMouseLeave = () => setPointerGaze(null);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const autoPose = AUTONOMOUS_SEQUENCE[stepIdx % AUTONOMOUS_SEQUENCE.length].pose;

  const activeGx = isTypingPrompt ? 0 : pointerGaze ? pointerGaze.gx : autoPose.gx;
  const activeGy = isTypingPrompt ? 0.36 : pointerGaze ? pointerGaze.gy : autoPose.gy;
  const activeTilt = isTypingPrompt ? 0 : pointerGaze ? -pointerGaze.gx * 18 : autoPose.tilt;
  const activeOpenY = autoPose.openY < 0.2 ? 0.08 : isHovered ? 0.64 : isTypingPrompt ? 0.84 : 1;

  // 3D spherical projection math inside 100x100 viewBox
  const centerX = 50 + activeGx * 15.5;
  const centerY = 48 + activeGy * 13.5;
  const halfGap = 11.4 * (1 - 0.16 * Math.abs(activeGx));

  const leftWidth = 11.8 * (1 - 0.28 * Math.max(0, -activeGx));
  const rightWidth = 11.8 * (1 - 0.28 * Math.max(0, activeGx));
  const fullEyeHeight = 24;
  const leftHeight = Math.max(3, fullEyeHeight * activeOpenY);
  const rightHeight = Math.max(3, fullEyeHeight * activeOpenY * (1 - 0.06 * Math.abs(activeGx)));

  const leftCx = centerX - halfGap;
  const rightCx = centerX + halfGap;
  const leftCy = centerY + activeGx * 1.8;
  const rightCy = centerY - activeGx * 1.8;

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Talk to Verndly AI"
      className="relative inline-flex h-36 w-36 cursor-pointer items-center justify-center outline-none transition-transform duration-200 hover:scale-[1.04] active:scale-95 sm:h-44 sm:w-44 md:h-52 md:w-52"
    >
      <motion.svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
        className="h-full w-full select-none overflow-visible"
      >
        <defs>
          <radialGradient id={sphereGradId} cx="34%" cy="26%" r="74%" fx="28%" fy="22%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="28%" stopColor="#dc2626" />
            <stop offset="62%" stopColor="#b91c1c" />
            <stop offset="88%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>

          <radialGradient id={sheenGradId} cx="30%" cy="22%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={rimGradId} cx="72%" cy="78%" r="48%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <circle cx="50" cy="50" r="46" fill={`url(#${sphereGradId})`} />
          <circle cx="50" cy="50" r="46" fill={`url(#${rimGradId})`} />
          <circle cx="50" cy="50" r="46" fill={`url(#${sheenGradId})`} />

          {/* Expressive dark capsule eyes — strictly NO mouth */}
          <motion.g
            animate={{ rotate: activeTilt }}
            transition={EYE_SPRING}
            style={{ originX: `${centerX}px`, originY: `${centerY}px` }}
          >
            <motion.rect
              animate={{
                x: leftCx - leftWidth / 2,
                y: leftCy - leftHeight / 2,
                width: leftWidth,
                height: leftHeight,
                rx: Math.min(leftWidth, leftHeight) / 2,
              }}
              transition={EYE_SPRING}
              fill="#120a0a"
            />
            <motion.rect
              animate={{
                x: rightCx - rightWidth / 2,
                y: rightCy - rightHeight / 2,
                width: rightWidth,
                height: rightHeight,
                rx: Math.min(rightWidth, rightHeight) / 2,
              }}
              transition={EYE_SPRING}
              fill="#120a0a"
            />
          </motion.g>
        </g>
      </motion.svg>
    </button>
  );
}
