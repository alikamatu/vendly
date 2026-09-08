import React from "react";
import JsonLd from "./JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

export interface StoreSchemaInput {
  id?: string;
  store_name: string;
  store_link: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  is_verified?: boolean;
  products_count?: number;
  top_products?: Array<{
    id: string;
    title: string;
    price: number | string;
    image_url?: string | null;
  }>;
}

export default function StoreJsonLd({ store }: { store: StoreSchemaInput }) {
  const storeUrl = absoluteUrl(`/s/${store.store_link}`);
  const logo = store.logo_url
    ? absoluteUrl(store.logo_url)
    : `${SITE_URL}/logos/verndly.png`;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "@id": `${storeUrl}#store`,
        name: store.store_name,
        description: store.description || `Shop verified products from ${store.store_name} on ${SITE_NAME}.`,
        url: storeUrl,
        logo,
        image: store.banner_url ? absoluteUrl(store.banner_url) : logo,
        telephone: store.phone || undefined,
        currenciesAccepted: "GHS",
        paymentAccepted: "Cash, Credit Card, Mobile Money, Paystack",
        address: {
          "@type": "PostalAddress",
          addressLocality: store.city || "Accra",
          addressCountry: store.country || "GH",
        },
        parentOrganization: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
        ...(store.top_products && store.top_products.length > 0
          ? {
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: `${store.store_name} Catalog`,
                itemListElement: store.top_products.slice(0, 10).map((p, idx) => ({
                  "@type": "Offer",
                  position: idx + 1,
                  itemOffered: {
                    "@type": "Product",
                    name: p.title,
                    url: absoluteUrl(`/product/${p.id}`),
                    image: p.image_url ? absoluteUrl(p.image_url) : undefined,
                  },
                  price: Number(p.price).toFixed(2),
                  priceCurrency: "GHS",
                  availability: "https://schema.org/InStock",
                })),
              },
            }
          : {}),
      }}
    />
  );
}
