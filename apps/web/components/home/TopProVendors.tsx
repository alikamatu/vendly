"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import SectionHeader from "./SectionHeader";
import VendorCard from "./VendorCard";
import type { TopProVendor } from "@/lib/api/store";

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
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [vendors.length]);

  function scrollBy(dir: "left" | "right") {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.85 : el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (!vendors.length) return null;

  return (
    <section className="space-y-6 md:space-y-8">
      <SectionHeader
        eyebrow={
          <>
            <Crown className="w-3.5 h-3.5" />
            Top Pro Vendors
          </>
        }
        title="Featured Pro sellers"
        description="Hand-picked Pro vendors delivering quality across the Vendly marketplace."
        action={
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scrollBy("left")}
              disabled={atStart}
              aria-label="Scroll vendors left"
              className="p-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy("right")}
              disabled={atEnd}
              aria-label="Scroll vendors right"
              className="p-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div
        ref={railRef}
        role="region"
        aria-label="Top Pro vendors carousel"
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:mx-0 md:px-0 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {vendors.map((v, idx) => (
          <div
            key={v.id}
            className="snap-start flex-shrink-0 w-[78vw] xs:w-[60vw] sm:w-[320px] md:w-[300px] lg:w-[calc((100%-3rem)/3)]"
          >
            <VendorCard vendor={v} rank={idx + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}
