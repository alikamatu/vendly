import type { Metadata } from "next";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

async function fetchStore(slug: string) {
  try {
    const res = await fetch(`${API_URL}/stores/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === "object" && "data" in json ? json.data : json;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchStore(slug);
  if (!store) {
    return buildMetadata({
      title: "Store not found",
      noindex: true,
      path: `/s/${slug}`,
    });
  }
  return buildMetadata({
    title: `${store.store_name} on Verndly`,
    description:
      store.bio?.slice(0, 180) ||
      `Shop directly from ${store.store_name} — verified seller on Verndly.`,
    path: `/s/${slug}`,
    image: store.logo_url,
    keywords: [store.store_name, store.location, "Verndly seller"].filter(
      Boolean,
    ) as string[],
  });
}

export default async function StoreLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const store = await fetchStore(slug);
  return (
    <>
      {store && (
        <>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: store.store_name,
              url: `${SITE_URL}/s/${slug}`,
              image: store.logo_url || undefined,
              description: store.bio || `Verndly storefront for ${store.store_name}`,
              address: store.location
                ? {
                    "@type": "PostalAddress",
                    addressLocality: store.location,
                    addressCountry: "GH",
                  }
                : undefined,
              aggregateRating:
                store.rating_count > 0
                  ? {
                      "@type": "AggregateRating",
                      ratingValue: store.rating_avg,
                      reviewCount: store.rating_count,
                    }
                  : undefined,
            }}
          />
          <BreadcrumbJsonLd
            items={[
              { name: "Home", path: "/" },
              { name: "Stores", path: "/stores" },
              { name: store.store_name, path: `/s/${slug}` },
            ]}
          />
        </>
      )}
      {children}
    </>
  );
}
