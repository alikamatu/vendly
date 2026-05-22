"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle, 
  Package,
  ArrowLeft,
  ChevronRight,
  Flame
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/contexts/auth-context";
import { productApi } from "@/lib/api/product";
import SellerProductCard from "@/components/products/SellerProductCard";

export default function SellerProductsPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [promotionStates, setPromotionStates] = useState<Record<string, "idle" | "verifying" | "payment_required" | "failed">>({});

  useEffect(() => {
    fetchProducts();
  }, [token]);

  useEffect(() => {
    const processCallback = async () => {
      const hotSalePayment = searchParams.get("hot_sale_payment");
      const reference = searchParams.get("reference");
      const productId = searchParams.get("product_id");

      if (!token || hotSalePayment !== "1" || !reference || !productId) return;

      setPromotionStates((prev) => ({ ...prev, [productId]: "verifying" }));
      setActionMessage("Verifying Hot Sales payment...");

      try {
        const verifyResult = await productApi.verifyHotSalesPayment(
          token,
          reference,
          productId,
        );
        await fetchProducts();
        if (verifyResult.verified && verifyResult.is_featured) {
          setActionMessage("Payment verified. Hot Sales enabled.");
        } else {
          setActionMessage("Payment still pending. Please refresh in a moment.");
          setPromotionStates((prev) => ({ ...prev, [productId]: "payment_required" }));
        }
      } catch (err: any) {
        setPromotionStates((prev) => ({ ...prev, [productId]: "failed" }));
        setError(err.message || "Failed to verify Hot Sales payment");
      } finally {
        router.replace(pathname);
      }
    };

    processCallback();
  }, [searchParams, token, pathname, router]);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await productApi.getSellerProducts(token);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await productApi.deleteProduct(token, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const handleToggleHotSales = async (id: string, currentState: boolean) => {
    if (!token) return;
    try {
      if (!currentState) {
        setPromotionStates((prev) => ({ ...prev, [id]: "verifying" }));
        try {
          await productApi.toggleHotSales(token, id, true);
          setProducts((prev) =>
            prev.map((product) =>
              product.id === id ? { ...product, is_featured: true } : product,
            ),
          );
          setActionMessage("Hot Sales enabled successfully.");
          setPromotionStates((prev) => ({ ...prev, [id]: "idle" }));
          setTimeout(() => setActionMessage(null), 2500);
          return;
        } catch (toggleErr: any) {
          if (!String(toggleErr?.message || "").toLowerCase().includes("payment")) {
            throw toggleErr;
          }
          setPromotionStates((prev) => ({ ...prev, [id]: "payment_required" }));
        }

        const init = await productApi.initializeHotSalesPayment(token, id);
        if (!init.checkout_url) {
          throw new Error("Unable to initialize payment. Please try again.");
        }
        window.location.href = init.checkout_url;
        return;
      }

      await productApi.toggleHotSales(token, id, false);
      setProducts((prev) =>
        prev.map((product) =>
          product.id === id ? { ...product, is_featured: false } : product,
        ),
      );
      setActionMessage("Hot Sales disabled for this product.");
      setPromotionStates((prev) => ({ ...prev, [id]: "idle" }));
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      setPromotionStates((prev) => ({ ...prev, [id]: "failed" }));
      setError(err.message || "Failed to update Hot Sales status");
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider animate-pulse italic">
            Fetching Inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-[9px] font-medium text-muted uppercase tracking-wider">Dashboard</span>
            <ChevronRight className="w-3 h-3 text-muted/30" />
            <span className="text-[9px] font-medium text-foreground uppercase tracking-wider">Inventory</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight uppercase">Product Lab</h2>
          <p className="text-[10px] text-muted font-normal uppercase tracking-wider italic">
            Manage and optimize your listings • {products.length} total items
          </p>
        </div>

        <Link href="/dashboard/products/add">
          <Button size="sm" className="h-12 px-8 rounded-2xl flex items-center gap-2 group shadow-xl shadow-primary/20">
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Post New item</span>
          </Button>
        </Link>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-4 gap-4 px-2">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
          <Input 
            placeholder="Search items by title..." 
            className="h-12 pl-12 bg-surface/30 border-none shadow-sm rounded-2xl text-[11px] font-normal uppercase tracking-wider placeholder:lowercase italic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="h-12 px-4 bg-surface/30 border-none rounded-2xl text-[10px] font-medium uppercase tracking-wide outline-none cursor-pointer hover:bg-surface/50 transition-colors appearance-none text-center shadow-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Status: All</option>
          <option value="active">Active Only</option>
          <option value="draft">Drafts</option>
          <option value="out_of_stock">Sold Out</option>
        </select>
      </div>

      {actionMessage && (
        <div className="mx-2 flex items-center gap-2 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-700">
          <Flame className="w-4 h-4" />
          <p className="text-[10px] font-medium uppercase tracking-wider">{actionMessage}</p>
        </div>
      )}

      {/* Listings */}
      <div className="space-y-4">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredProducts.map((product, idx) => (
              <SellerProductCard 
                key={product.id} 
                product={product} 
                promotionState={promotionStates[product.id] || "idle"}
                onDelete={handleDelete}
                onToggleHotSales={handleToggleHotSales}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-24 text-center space-y-4 border border-dashed border-border/50 rounded-[2.5rem] bg-surface/10 mx-2 shadow-inner"
          >
            <div className="relative inline-block">
               <Package className="w-12 h-12 text-muted mx-auto opacity-10" />
               {searchQuery && (
                 <motion.div 
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-lg text-white"
                 >
                   <Search className="w-3 h-3" />
                 </motion.div>
               )}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted font-medium uppercase tracking-wider">
                {searchQuery ? "No matches found" : "Your inventory is empty"}
              </p>
              <p className="text-[9px] text-muted/60 font-medium uppercase tracking-wider italic">
                {searchQuery ? "Try refining your search keywords" : "Start selling by posting your first product"}
              </p>
            </div>
            {!searchQuery && (
              <Link href="/dashboard/products/add" className="inline-block mt-4">
                <Button size="sm" variant="secondary" className="rounded-xl px-8 text-[9px] font-medium uppercase tracking-wider border-border/50 bg-transparent">
                   Initialize Inventory
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl mx-2 border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          <p className="text-[10px] font-medium uppercase tracking-wider">{error}</p>
        </div>
      )}
    </div>
  );
}
