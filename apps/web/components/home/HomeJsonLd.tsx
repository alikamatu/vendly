"use client";

import React from "react";
import type { HomeCategory } from "@/hooks/useHomeData";

interface HomeJsonLdProps {
  categories: HomeCategory[];
}

/** Server-renders structured data for SEO. */
export default function HomeJsonLd({ categories }: HomeJsonLdProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://verndly.com";

  // NOTE: the site-wide WebSite + SearchAction schema is emitted once from
  // OrganizationJsonLd (root layout). We deliberately do NOT repeat it here —
  // two WebSite nodes on one page muddy Google's entity resolution. This
  // component only contributes the home page's category ItemList, with each
  // item pointing at its real, crawlable category listing URL.
  const cats = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Product Categories",
    itemListElement: categories.map((cat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cat.name,
      description: `Browse and buy verified ${cat.name} products from trusted young entrepreneurs.`,
      url: `${origin}/products?category=${encodeURIComponent(cat.name)}`,
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cats) }} />
  );
}
