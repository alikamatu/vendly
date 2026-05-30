import HomeView from "@/components/home/HomeView";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shop independent stores — Verndly",
  description:
    "Browse thousands of products from verified independent stores and young entrepreneurs across Ghana. Find clothing, electronics, beauty, food, and more in one trusted marketplace.",
  path: "/",
});

export default function HomePage() {
  return <HomeView />;
}
