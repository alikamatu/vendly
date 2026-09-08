"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthTabs from '@/components/auth/auth-tabs';
import AuthShowcase from '@/components/auth/AuthShowcase';
import { ShieldCheck } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'login' | 'register') || 'login';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Column: Form Section (~30%) */}
      <div className="w-full lg:w-[32%] xl:w-[30%] min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-12 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background z-10">
        <div>
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8 group">
            <img
              src="/logos/verndly.png"
              alt="Verndly"
              className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-lg tracking-tight text-foreground">
              Verndly
            </span>
          </Link>

          {/* Heading */}
          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
              Sign in to manage your orders, storefront, and payouts.
            </p>
          </div>

          {/* Auth Tabs / Form */}
          <AuthTabs defaultTab={mode} />
        </div>

        {/* Minimal Footer */}
        <div className="pt-8 mt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-foreground/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>256-bit SSL • Verified Platform</span>
          </div>
          <span className="font-mono text-foreground/30">v1.0</span>
        </div>
      </div>

      {/* Right Column: Full-Height Showcase Area (70%) */}
      <AuthShowcase
        headline="Commerce engineered for the"
        highlightWords="next generation."
        description="Direct mobile money rails, instant checkout, and verified buyer trust for young entrepreneurs across Ghana."
        testimonial={{
          quote:
            "Verndly completely eliminated manual MoMo screenshots and WhatsApp DM chaos. Our brand doubled sales within the first month.",
          author: "Kweku Mensah",
          role: "Founder, SneakerLab GH • Independent Brand",
          avatarText: "KM",
          metric: "GH₵ 48,000+ settled",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
