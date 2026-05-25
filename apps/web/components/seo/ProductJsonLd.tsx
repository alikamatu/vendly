import React from "react";
import JsonLd from "./JsonLd";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export interface ProductSchemaInput {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  currency?: string | null;
  images?: string[];
  rating_avg?: number | null;
  rating_count?: number | null;
  condition?: string | null;
  brand?: string | null;
  category?: string | null;
  quantity_available?: number | null;
  seller?: { store_name?: string | null; store_link?: string | null } | null;
}

/** Maps our internal condition strings to schema.org item-condition URIs. */
function conditionUri(c?: string | null) {
  switch ((c || "").toLowerCase()) {
    case "new":
      return "https://schema.org/NewCondition";
    case "used":
      return "https://schema.org/UsedCondition";
    case "refurbished":
      return "https://schema.org/RefurbishedCondition";
    default:
      return "https://schema.org/NewCondition";
  }
}

export default function ProductJsonLd({ product }: { product: ProductSchemaInput }) {
  const url = absoluteUrl(`/product/${product.id}`);
  const inStock =
    typeof product.quantity_available === "number"
      ? product.quantity_available > 0
      : true;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description || product.title,
        sku: product.id,
        image: (product.images || []).map((u) => u),
        url,
        category: product.category || undefined,
        brand: product.brand
          ? { "@type": "Brand", name: product.brand }
          : undefined,
        itemCondition: conditionUri(product.condition),
        offers: {
          "@type": "Offer",
          url,
          price: String(product.price),
          priceCurrency: (product.currency || "GHS").toUpperCase(),
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: product.seller?.store_name
            ? { "@type": "Organization", name: product.seller.store_name }
            : { "@type": "Organization", name: SITE_NAME },
        },
        aggregateRating:
          product.rating_count && product.rating_count > 0 && product.rating_avg
            ? {
                "@type": "AggregateRating",
                ratingValue: product.rating_avg,
                reviewCount: product.rating_count,
              }
            : undefined,
      }}
    />
  );
}
