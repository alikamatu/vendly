import HomeView from "@/components/home/HomeView";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import ItemListJsonLd from "@/components/seo/ItemListJsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

export const metadata = buildMetadata({
  title: "Verndly — Discover & Shop Verified Independent Stores in Ghana",
  description:
    "Browse thousands of verified products from independent stores and top young entrepreneurs across Ghana. Protected by 7-day escrow returns and fast courier delivery.",
  path: "/",
  keywords: [
    "Ghana marketplace",
    "online shopping Ghana",
    "buy online Accra",
    "independent stores Ghana",
    "verified sellers Ghana",
    "electronics fashion beauty Ghana",
    "Paystack escrow shopping",
    "Verndly",
  ],
});

async function fetchFeaturedProducts() {
  try {
    const res = await fetch(`${API_URL}/products?limit=16`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json && typeof json === "object" && "data" in json ? json.data : json;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const topProducts = await fetchFeaturedProducts();

  return (
    <>
      {topProducts.length > 0 && (
        <ItemListJsonLd
          name="Top Featured Products on Verndly"
          description="Trending and featured products from verified independent stores across Ghana."
          items={topProducts.map((p: any) => ({
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
      <HomeView />
    </>
  );
}
