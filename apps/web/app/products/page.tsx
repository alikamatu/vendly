import ProductsBrowser from "@/components/products-browser/ProductsBrowser";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shop all products",
  description:
    "Browse, filter and search every product on Vendly. Find verified items from trusted sellers across categories, brands, and price ranges.",
  path: "/products",
  keywords: ["shop", "buy online", "Ghana products", "marketplace"],
});

export default function ProductsPage() {
  return <ProductsBrowser />;
}
