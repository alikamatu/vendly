"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { productApi, BrowseProduct } from "@/lib/api/product";
import ProductCard from "@/components/products/ProductCard";

interface ProductsYouMightLikeProps {
  cartProductIds?: string[];
  categoryHint?: string;
  limit?: number;
}

export default function ProductsYouMightLike({
  cartProductIds = [],
  categoryHint,
  limit = 8,
}: ProductsYouMightLikeProps) {
  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecommendations() {
      try {
        setIsLoading(true);

        // Fetch products, with category hint if available
        const response = await productApi.browseProducts({
          category: categoryHint || undefined,
          sort: "popular",
          limit: limit + cartProductIds.length + 4,
          in_stock: true,
        });

        if (isCancelled) return;

        // Filter out items already in the user's cart
        const filtered = (response.data || [])
          .filter((p) => !cartProductIds.includes(String(p.id)))
          .slice(0, limit);

        // If category hint was too narrow and produced few results, fallback to general popular
        if (filtered.length < 4 && categoryHint) {
          const generalResponse = await productApi.browseProducts({
            sort: "popular",
            limit: limit + cartProductIds.length,
            in_stock: true,
          });

          if (isCancelled) return;

          const combined = [
            ...filtered,
            ...(generalResponse.data || []).filter(
              (p) =>
                !cartProductIds.includes(String(p.id)) &&
                !filtered.some((f) => f.id === p.id),
            ),
          ].slice(0, limit);

          setProducts(combined);
        } else {
          setProducts(filtered);
        }
      } catch (err) {
        console.error("Failed to load recommended products:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isCancelled = true;
    };
  }, [categoryHint, cartProductIds.join(","), limit]);

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-primary font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Curated For You
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-1">
            Products you might like
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trending picks and customer favorites from young entrepreneurs
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span>Explore all products</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-3xl bg-surface/40 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                title: product.title,
                price: String(product.price),
                original_price: product.original_price,
                image_urls: product.image_urls || [],
                video_url: product.video_url,
                is_featured: product.is_featured,
                seller: {
                  store_name: product.seller?.store_name || "Verified Store",
                  logo_url: product.seller?.logo_url || undefined,
                  store_link: product.seller?.store_link || "store",
                },
              }}
              index={idx}
            />
          ))}
        </div>
      )}
    </section>
  );
}
