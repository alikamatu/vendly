import React from "react";
import JsonLd from "./JsonLd";
import { absoluteUrl } from "@/lib/seo";

export interface Crumb {
  name: string;
  /** Path relative to site root, e.g. `/products?category=clothing`. */
  path: string;
}

export default function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: absoluteUrl(c.path),
        })),
      }}
    />
  );
}
