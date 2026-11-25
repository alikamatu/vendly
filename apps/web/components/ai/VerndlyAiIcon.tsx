'use client';

import React, { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from '@/utils/clsx';

export type VerndlyAiMood = 'idle' | 'working' | 'happy';

interface EyePose {
  /** Horizontal head turn: -1 (left) to 1 (right) */
  gx: number;
  /** Vertical head pitch: -1 (up) to 1 (down) */
  gy: number;
  /** Extra expressive head tilt in degrees */
  tilt: number;
  /** Eye vertical openness: 1 = open, 0.12 = blink, 0.62 = happy squint */
  openY: number;
}

// Signature resting pose inspired by the 3D spherical look-up-right reference
const ICONIC_POSE: EyePose = { gx: 0.52, gy: -0.42, tilt: -22, openY: 1 };

const IDLE_SEQUENCE: Array<{ pose: EyePose; duration: number }> = [
  { pose: ICONIC_POSE, duration: 2800 },
  { pose: { ...ICONIC_POSE, openY: 0.1 }, duration: 130 },
  { pose: ICONIC_POSE, duration: 2200 },
  { pose: { gx: -0.35, gy: -0.25, tilt: 14, openY: 1 }, duration: 1500 },
  { pose: { gx: 0, gy: -0.08, tilt: 0, openY: 1 }, duration: 1400 },
  { pose: { gx: 0, gy: -0.08, tilt: 0, openY: 0.1 }, duration: 120 },
];

const WORKING_SEQUENCE: Array<{ pose: EyePose; duration: number }> = [
  { pose: { gx: 0.58, gy: -0.46, tilt: -25, openY: 1 }, duration: 720 },
  { pose: { gx: -0.56, gy: -0.2, tilt: 16, openY: 1 }, duration: 680 },
  { pose: { gx: -0.56, gy: -0.2, tilt: 16, openY: 0.1 }, duration: 110 },
  { pose: { gx: 0.52, gy: 0.16, tilt: -10, openY: 1 }, duration: 660 },
  { pose: { gx: -0.42, gy: 0.18, tilt: 10, openY: 1 }, duration: 640 },
  { pose: { gx: 0, gy: -0.32, tilt: 0, openY: 0.78 }, duration: 580 },
  { pose: { gx: 0, gy: -0.32, tilt: 0, openY: 0.1 }, duration: 110 },
  { pose: { gx: 0.45, gy: -0.38, tilt: -20, openY: 1 }, duration: 700 },
];

const HAPPY_POSE: EyePose = { gx: 0.22, gy: -0.24, tilt: -10, openY: 0.58 };

const EYE_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 26,
  mass: 0.7,
};

export interface VerndlyAiIconProps {
  /** Pixel size of the circular icon (default 20) */
  size?: number;
  /** Expressive animation state */
  mood?: VerndlyAiMood;
  /** Disable motion when used in dense lists if desired */
  animated?: boolean;
  /** Render "Verndly AI" wordmark right beside the icon */
  showName?: boolean;
  nameClassName?: string;
  className?: string;
}

/**
 * Reusable Verndly AI character icon:
 * - Tactile, almost-3D `red-700` (#b91c1c) spherical face
 * - Two expressive dark capsule eye marks with 3D spherical foreshortening & blinking
 * - Strictly NO mouth
 */
export default function VerndlyAiIcon({
  size = 20,
  mood = 'idle',
  animated = true,
  showName = false,
  nameClassName,
  className,
}: VerndlyAiIconProps) {
  const uid = useId().replace(/:/g, '');
  const sphereGradId = `verndly-ai-sphere-${uid}`;
  const sheenGradId = `verndly-ai-sheen-${uid}`;
  const clipId = `verndly-ai-clip-${uid}`;

  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (!animated || mood === 'happy') return;
    const seq = mood === 'working' ? WORKING_SEQUENCE : IDLE_SEQUENCE;
    const current = seq[stepIdx % seq.length];
    const timer = setTimeout(() => {
      setStepIdx((prev) => (prev + 1) % seq.length);
    }, current.duration);
    return () => clearTimeout(timer);
  }, [animated, mood, stepIdx]);

  const pose: EyePose = !animated
    ? ICONIC_POSE
    : mood === 'happy'
      ? HAPPY_POSE
      : mood === 'working'
        ? WORKING_SEQUENCE[stepIdx % WORKING_SEQUENCE.length].pose
        : IDLE_SEQUENCE[stepIdx % IDLE_SEQUENCE.length].pose;

  // Compute 3D-foreshortened eye coordinates inside the 100x100 viewBox
  const centerX = 50 + pose.gx * 14.5;
  const centerY = 48 + pose.gy * 12.5;
  const halfGap = 11.2 * (1 - 0.16 * Math.abs(pose.gx));

  const leftWidth = 11.6 * (1 - 0.28 * Math.max(0, -pose.gx));
  const rightWidth = 11.6 * (1 - 0.28 * Math.max(0, pose.gx));
  const fullEyeHeight = 23.5;
  const leftHeight = Math.max(3.2, fullEyeHeight * pose.openY);
  const rightHeight = Math.max(3.2, fullEyeHeight * pose.openY * (1 - 0.06 * Math.abs(pose.gx)));

  const leftCx = centerX - halfGap;
  const rightCx = centerX + halfGap;
  // Slight spherical curvature offset when looking toward a corner
  const leftCy = centerY + pose.gx * 1.6;
  const rightCy = centerY - pose.gx * 1.6;

  const svgNode = (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      animate={animated && mood === 'working' ? { scale: [1, 1.04, 0.98, 1] } : { scale: 1 }}
      transition={
        animated && mood === 'working'
          ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      className={clsx('shrink-0 select-none overflow-visible', !showName && className)}
    >
      <defs>
        {/* Tactile 3D-shaded red-700 sphere gradient */}
        <radialGradient id={sphereGradId} cx="34%" cy="28%" r="74%" fx="30%" fy="24%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="46%" stopColor="#b91c1c" />
          <stop offset="84%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>

        {/* Subtle upper-left specular highlight for soft 3D volume */}
        <radialGradient id={sheenGradId} cx="32%" cy="24%" r="42%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Base red-700 sphere */}
        <circle cx="50" cy="50" r="46" fill={`url(#${sphereGradId})`} />

        {/* Soft 3D top-left highlight */}
        <circle cx="50" cy="50" r="46" fill={`url(#${sheenGradId})`} />

        {/* Two dark rounded-pill eyes (strictly NO mouth) */}
        <motion.g
          animate={{
            rotate: pose.tilt,
          }}
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
  );

  if (!showName) {
    return svgNode;
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      {svgNode}
      <span className={clsx('font-semibold tracking-tight', nameClassName)}>Verndly AI</span>
    </span>
  );
}
