"use client";

import React from "react";
import type { HomeCategory } from "@/hooks/useHomeData";

interface HomeJsonLdProps {
  categories: HomeCategory[];
}

/** Server-renders structured data for SEO. */
export default function HomeJsonLd({ categories }: HomeJsonLdProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://vendly.com";

  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vendly",
    url: origin,
    description: "Discover and shop from trusted, verified entrepreneurs all in one place.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${origin}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const cats = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Product Categories",
    itemListElement: categories.map((cat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cat.name,
      description: `Browse and buy verified ${cat.name} products from trusted student entrepreneurs.`,
      url: `${origin}/#marketplace`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cats) }} />
    </>
  );
}
