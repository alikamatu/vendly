"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthTabs from '@/components/auth/auth-tabs';
import AuthShowcase from '@/components/auth/AuthShowcase';
import { ShieldCheck } from 'lucide-react';

function RegisterContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'login' | 'register') || 'register';

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
              Create an account
            </h1>
            <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
              Join thousands of verified entrepreneurs and buyers across Ghana.
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
        headline="Launch your store in 60s."
        highlightWords="Sell to thousands."
        description="Zero monthly fees. Zero upfront costs. Automatic Mobile Money settlement directly to your wallet."
        testimonial={{
          quote:
            "Setting up our storefront took under 2 minutes. Having an official verndly.market link gave us immediate credibility with thousands of customers across Ghana.",
          author: "Akosua Boateng",
          role: "Creative Director, AfroChic Apparel • Accra",
          avatarText: "AB",
          metric: "1,400+ orders",
        }}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
