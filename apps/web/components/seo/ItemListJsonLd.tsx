import React from "react";
import JsonLd from "./JsonLd";
import { absoluteUrl } from "@/lib/seo";

export interface ItemListEntry {
  id: string;
  name: string;
  url?: string;
  image?: string | null;
  price?: number | string | null;
  currency?: string | null;
  description?: string | null;
}

export default function ItemListJsonLd({
  name,
  description,
  items,
}: {
  name: string;
  description?: string;
  items: ItemListEntry[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        description,
        numberOfItems: items.length,
        itemListElement: items.slice(0, 30).map((item, index) => {
          const itemUrl = item.url ? absoluteUrl(item.url) : absoluteUrl(`/product/${item.id}`);
          return {
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            url: itemUrl,
            item: {
              "@type": "Product",
              name: item.name,
              url: itemUrl,
              image: item.image ? absoluteUrl(item.image) : undefined,
              description: item.description || undefined,
              ...(item.price !== undefined && item.price !== null
                ? {
                    offers: {
                      "@type": "Offer",
                      price: Number(item.price).toFixed(2),
                      priceCurrency: (item.currency || "GHS").toUpperCase(),
                      availability: "https://schema.org/InStock",
                    },
                  }
                : {}),
            },
          };
        }),
      }}
    />
  );
}
