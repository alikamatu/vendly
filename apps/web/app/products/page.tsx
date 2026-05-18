import type { Metadata } from "next";
import ProductsBrowser from "@/components/products-browser/ProductsBrowser";

export const metadata: Metadata = {
  title: "Products · Vendly",
  description:
    "Browse, filter and search every product on Vendly. Find verified items from trusted sellers across categories, brands, and price ranges.",
};

export default function ProductsPage() {
  return <ProductsBrowser />;
}
