import React from "react";
import JsonLd from "./JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

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
  seller?: { store_name?: string | null; store_link?: string | null; image_url?: string | null } | null;
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

  // Price valid 1 year into the future
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  const sellerUrl = product.seller?.store_link
    ? absoluteUrl(`/s/${product.seller.store_link}`)
    : SITE_URL;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description || product.title,
        sku: product.id,
        mpn: product.id,
        image: (product.images && product.images.length > 0)
          ? product.images.map((u) => absoluteUrl(u))
          : [`${SITE_URL}/logos/verndly.png`],
        url,
        category: product.category || undefined,
        brand: {
          "@type": "Brand",
          name: product.brand || product.seller?.store_name || SITE_NAME,
        },
        itemCondition: conditionUri(product.condition),
        offers: {
          "@type": "Offer",
          url,
          price: Number(product.price).toFixed(2),
          priceCurrency: (product.currency || "GHS").toUpperCase(),
          priceValidUntil: priceValidUntil.toISOString().split("T")[0],
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: conditionUri(product.condition),
          seller: {
            "@type": "Store",
            name: product.seller?.store_name || SITE_NAME,
            url: sellerUrl,
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "GH",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 7,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
            refundType: "https://schema.org/FullRefund",
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "0.00",
              currency: "GHS",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "GH",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 1,
                maxValue: 3,
                unitCode: "DAY",
              },
            },
          },
        },
        aggregateRating:
          product.rating_count && product.rating_count > 0 && product.rating_avg
            ? {
                "@type": "AggregateRating",
                ratingValue: Number(product.rating_avg).toFixed(1),
                reviewCount: product.rating_count,
                bestRating: "5",
                worstRating: "1",
              }
            : undefined,
      }}
    />
  );
}
