import type { Metadata } from "next";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import JsonLd from "@/components/seo/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Browse Categories & Brands — Shop Verified Products",
  description:
    "Explore verified products by category and brand across Ghana. Discover phones, laptops, fashion, beauty, home essentials, books, and groceries from independent entrepreneurs.",
  path: "/categories",
  keywords: [
    "categories Ghana",
    "brands Ghana",
    "electronics Ghana",
    "fashion Ghana",
    "shoes Ghana",
    "beauty products Ghana",
    "independent stores Ghana",
    "online shopping categories",
  ],
});

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Verndly Categories & Brands",
          description:
            "Curated directory of shopping categories and verified brands across Ghana on Verndly.",
          url: `${SITE_URL}/categories`,
        }}
      />
      {children}
    </>
  );
}
