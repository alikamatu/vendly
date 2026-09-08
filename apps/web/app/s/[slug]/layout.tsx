import type { Metadata } from "next";
import { buildMetadata, SITE_URL, SITE_NAME } from "@/lib/seo";
import StoreJsonLd from "@/components/seo/StoreJsonLd";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import ItemListJsonLd from "@/components/seo/ItemListJsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

async function fetchStore(slug: string) {
  try {
    const res = await fetch(`${API_URL}/stores/link/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === "object" && "data" in json ? json.data : json;
  } catch {
    return null;
  }
}

async function fetchStoreProducts(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/store/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json && typeof json === "object" && "data" in json ? json.data : json;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
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
      description: "We couldn't find that store on Verndly.",
      noindex: true,
      path: `/s/${slug}`,
    });
  }

  const title = `${store.store_name} — Verified Store on Verndly`;
  const description =
    store.bio ||
    `Shop verified products directly from ${store.store_name} on Verndly. Backed by 7-day buyer protection escrow, secure Paystack checkout, and swift courier delivery across Ghana.`;

  const image =
    store.logo_url ||
    store.banner_url ||
    `${SITE_URL}/logos/verndly.png`;

  return buildMetadata({
    title,
    description: description.slice(0, 180),
    path: `/s/${slug}`,
    image,
    keywords: [
      store.store_name,
      "Ghana online store",
      "verified seller Ghana",
      "independent vendor",
      store.city || "Accra",
      "Verndly store",
      "buy online Ghana",
    ].filter(Boolean) as string[],
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
  const [store, products] = await Promise.all([
    fetchStore(slug),
    fetchStoreProducts(slug),
  ]);

  return (
    <>
      {store && (
        <>
          <StoreJsonLd
            store={{
              store_name: store.store_name,
              store_link: store.store_link || slug,
              description: store.bio,
              logo_url: store.logo_url,
              banner_url: store.banner_url,
              phone: store.whatsapp_number,
              city: store.city,
              country: "GH",
              is_verified: !!store.is_verified,
              products_count: products.length,
              top_products: products.slice(0, 10).map((p: any) => ({
                id: String(p.id),
                title: p.title,
                price: p.price,
                image_url: p.image_urls?.[0] || null,
              })),
            }}
          />
          <BreadcrumbJsonLd
            items={[
              { name: "Home", path: "/" },
              { name: "Stores", path: "/stores" },
              { name: store.store_name, path: `/s/${slug}` },
            ]}
          />
          {products.length > 0 && (
            <ItemListJsonLd
              name={`${store.store_name} Products Catalog`}
              description={`Browse products from ${store.store_name} on Verndly.`}
              items={products.map((p: any) => ({
                id: String(p.id),
                name: p.title,
                url: `/product/${p.id}`,
                image: p.image_urls?.[0] || null,
                price: p.price,
                currency: p.currency || "GHS",
                description: p.description,
              }))}
            />
          )}
        </>
      )}
      {children}
    </>
  );
}
