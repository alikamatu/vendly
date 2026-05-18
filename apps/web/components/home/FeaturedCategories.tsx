"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { resolveCategoryImage } from "@/lib/home/category-image";
import type { HomeCategory, HomeProduct } from "@/hooks/useHomeData";

interface FeaturedCategoryItem {
  category: HomeCategory;
  count: number;
}

interface FeaturedCategoriesProps {
  categories: HomeCategory[];
  products: HomeProduct[];
  activeCategory: string | null;
  onSelect: (name: string | null) => void;
}

/**
 * Renders the three most-stocked categories in a featured layout:
 *  - hero card on the left at 2× the width / equal height
 *  - two smaller cards stacked on the right (mobile: full stack)
 */
export default function FeaturedCategories({
  categories,
  products,
  activeCategory,
  onSelect,
}: FeaturedCategoriesProps) {
  const ranked: FeaturedCategoryItem[] = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return categories
      .map((c) => ({ category: c, count: counts.get(c.name) || 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [categories, products]);

  if (ranked.length === 0) return null;

  const [hero, ...rest] = ranked;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
      <FeaturedCard
        item={hero}
        size="hero"
        active={activeCategory === hero.category.name}
        onSelect={onSelect}
      />
      <div className="md:col-span-1 grid grid-cols-1 gap-3 md:gap-4">
        {rest.map((item) => (
          <FeaturedCard
            key={item.category.id ?? item.category.name}
            item={item}
            size="sub"
            active={activeCategory === item.category.name}
            onSelect={onSelect}
          />
        ))}
        {/* If only 1 rest item, pad with empty filler so the column stays balanced */}
        {rest.length === 1 && <div aria-hidden className="hidden md:block" />}
      </div>
    </div>
  );
}

function FeaturedCard({
  item,
  size,
  active,
  onSelect,
}: {
  item: FeaturedCategoryItem;
  size: "hero" | "sub";
  active: boolean;
  onSelect: (name: string | null) => void;
}) {
  const isHero = size === "hero";
  const imageUrl = resolveCategoryImage(item.category.name, item.category.image_url);

  return (
    <motion.button
      {...({
        type: "button",
        onClick: () => onSelect(active ? null : item.category.name),
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
        whileHover: { scale: 1.005 },
        className: `group relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] text-left transition-all border w-full
          ${isHero ? "md:col-span-2 min-h-[280px] md:min-h-[400px]" : "min-h-[140px] md:min-h-[192px]"}
          ${active
            ? "border-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/20 shadow-lg shadow-[var(--color-accent)]/10"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:shadow-xl hover:shadow-[var(--color-accent)]/5"}`,
        "aria-pressed": active,
        "aria-label": `Browse ${item.category.name}`,
      } as HTMLMotionProps<"button">)}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={item.category.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
      <div
        className={`absolute inset-0 bg-[var(--color-accent)]/20 transition-opacity duration-300 ${
          active ? "opacity-30" : "opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Rank badge */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md text-white border border-white/20">
          {item.count} {item.count === 1 ? "Item" : "Items"}
        </span>
      </div>

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col justify-end ${isHero ? "p-5 md:p-7" : "p-4 md:p-5"}`}>
        <div className="space-y-2">
          <span className="inline-block text-white">
            <span
              className={`block font-black uppercase tracking-tight leading-tight ${
                isHero ? "text-2xl md:text-4xl" : "text-base md:text-xl"
              }`}
            >
              {item.category.name}
            </span>
          </span>
          {item.category.description && isHero && (
            <p className="text-white/75 text-xs md:text-sm max-w-md line-clamp-2 leading-relaxed">
              {item.category.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-white/90">
            <span
              className={`font-black uppercase tracking-widest ${
                isHero ? "text-[11px] md:text-xs" : "text-[10px]"
              }`}
            >
              Browse now
            </span>
            <ArrowRight
              className={`transition-transform group-hover:translate-x-1 ${isHero ? "w-4 h-4" : "w-3 h-3"}`}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
