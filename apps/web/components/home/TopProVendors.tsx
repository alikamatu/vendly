'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import SectionHeader from './SectionHeader';
import VendorCard from './VendorCard';
import type { TopProVendor } from '@/lib/api/store';
import Link from 'next/link';

interface TopProVendorsProps {
  vendors: TopProVendor[];
}

export default function TopProVendors({ vendors }: TopProVendorsProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [vendors.length]);

  function scrollBy(dir: 'left' | 'right') {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === 'left' ? -el.clientWidth * 0.85 : el.clientWidth * 0.85,
      behavior: 'smooth',
    });
  }

  if (!vendors.length) return null;

  const displayVendors = vendors.slice(0, 10);

  return (
    <section className="space-y-6 md:space-y-8">
      <SectionHeader
        eyebrow={
          <>
            <Crown className="h-3.5 w-3.5" />
            Top Pro Vendors
          </>
        }
        title="Featured Pro sellers"
        description="Hand-picked Pro vendors delivering quality across the Verndly marketplace."
        action={
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => scrollBy('left')}
              disabled={atStart}
              aria-label="Scroll vendors left"
              className="hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition-all hover:text-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBy('right')}
              disabled={atEnd}
              aria-label="Scroll vendors right"
              className="hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition-all hover:text-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div
        ref={railRef}
        role="region"
        aria-label="Top Pro vendors carousel"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:gap-6 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {displayVendors.map((v, idx) => (
          <div key={v.id} className="w-[160px] flex-shrink-0 snap-start md:w-[180px]">
            <VendorCard vendor={v} rank={idx + 1} />
          </div>
        ))}

        {/* Browse more vendors card */}
        <div className="flex w-[160px] flex-shrink-0 snap-start items-stretch md:w-[180px]">
          <Link
            href="/stores"
            className="bg-[var(--color-surface)]/50 hover:border-[var(--color-accent)]/40 group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] p-5 transition-all hover:bg-[var(--color-surface)]"
          >
            <div className="bg-[var(--color-accent)]/10 flex h-14 w-14 items-center justify-center rounded-full text-[var(--color-accent)] transition-all group-hover:scale-110 group-hover:bg-[var(--color-accent)] group-hover:text-white">
              <ChevronRight size={28} />
            </div>
            <span className="mt-2 text-sm font-semibold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-accent)]">
              Browse more
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
