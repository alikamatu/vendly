'use client';

import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export interface TestimonialData {
  quote: string;
  author: string;
  role: string;
  handle?: string;
  avatarText: string;
  metric?: string;
}

export interface AuthShowcaseProps {
  headline: string;
  highlightWords?: string;
  description: string;
  testimonial: TestimonialData;
}

function CurvedLinesBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full stroke-foreground/[0.08] dark:stroke-white/[0.07] select-none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 800"
      preserveAspectRatio="none"
      fill="none"
    >
      {/* Flowing harmonic bezier wave lines */}
      <path d="M-100,160 C200,60 480,300 1100,80" strokeWidth="1.2" />
      <path d="M-100,240 C240,120 520,380 1100,160" strokeWidth="1.2" />
      <path d="M-100,320 C280,180 560,460 1100,240" strokeWidth="1.2" />
      <path d="M-100,400 C320,240 600,540 1100,320" strokeWidth="1.2" />
      <path d="M-100,480 C360,300 640,620 1100,400" strokeWidth="1.2" />
      <path d="M-100,560 C400,360 680,700 1100,480" strokeWidth="1.2" />
      <path d="M-100,640 C440,420 720,780 1100,560" strokeWidth="1.2" />

      {/* Signature Verndly red-500 accent wave */}
      <path
        d="M-100,350 C300,200 580,490 1100,270"
        stroke="#ef4444"
        strokeWidth="1.4"
        strokeOpacity="0.32"
      />

      {/* Counter-balanced architectural curves */}
      <path
        d="M-100,740 C320,580 680,220 1100,360"
        strokeWidth="1"
        strokeDasharray="4 6"
        strokeOpacity="0.5"
      />
      <path
        d="M-100,820 C360,660 720,300 1100,440"
        strokeWidth="1"
        strokeDasharray="4 6"
        strokeOpacity="0.3"
      />
    </svg>
  );
}

export default function AuthShowcase({
  headline,
  highlightWords,
  description,
  testimonial,
}: AuthShowcaseProps) {
  return (
    <div className="relative hidden lg:flex lg:w-[68%] xl:w-[70%] h-screen overflow-hidden flex-col justify-between p-12 xl:p-16 2xl:p-20 bg-[#f9f9fb] dark:bg-[#070707] border-l border-border/40 select-none">
      {/* Mathematical curved lines SVG background (No gradient) */}
      <CurvedLinesBackground />

      {/* Top Bar: Version & Status Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface dark:bg-[#121212] px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Verndly Commerce Engine</span>
          <span className="text-foreground/30">•</span>
          <span className="font-mono text-secondary font-semibold">v1.0</span>
        </div>
      </div>

      {/* Center: Large Sleek Apple Headline */}
      <div className="relative z-10 my-auto max-w-2xl 2xl:max-w-3xl pr-4">
        <h2 className="text-4xl xl:text-5xl 2xl:text-6xl font-medium tracking-tight text-foreground leading-[1.12]">
          {headline}
          {highlightWords && (
            <span className="block text-secondary font-semibold mt-1">
              {highlightWords}
            </span>
          )}
        </h2>
        <p className="mt-5 text-base xl:text-lg text-foreground/60 leading-relaxed font-normal max-w-xl">
          {description}
        </p>
      </div>

      {/* Left Bottom: Supabase-Inspired Verified Testimonial */}
      <div className="relative z-10 max-w-lg">
        <div className="space-y-4">
          {/* Testimonial Quote */}
          <p className="text-sm xl:text-base text-foreground/85 leading-relaxed font-normal tracking-tight">
            “{testimonial.quote}”
          </p>

          {/* Author Block */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-semibold text-secondary shrink-0 border border-secondary/20">
              {testimonial.avatarText}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  {testimonial.author}
                </span>
                <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
              </div>
              <p className="text-[11px] sm:text-xs text-foreground/50 truncate font-normal">
                {testimonial.role}
              </p>
            </div>

            {testimonial.metric && (
              <div className="ml-auto hidden sm:block shrink-0 px-2.5 py-1 rounded-lg bg-surface/80 border border-border/50 text-[11px] font-medium text-foreground/70">
                {testimonial.metric}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
