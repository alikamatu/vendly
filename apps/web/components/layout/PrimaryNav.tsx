"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Search,
  Sparkles,
  Tag,
  Store,
  Menu,
  X,
  ArrowRight,
  LayoutGrid,
  Package,
  Crown,
  TrendingUp,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { productApi } from "@/lib/api/product";

interface Category {
  id?: string;
  name: string;
  image_url?: string | null;
}

interface Brand {
  id?: string;
  name: string;
  image_url?: string | null;
}

const PRIMARY_LINKS: { label: string; href: string; Icon: any }[] = [
  { label: "All products", href: "/products", Icon: LayoutGrid },
  { label: "Top deals", href: "/products?has_discount=1", Icon: Tag },
  { label: "Pro vendors", href: "/products?sort=popular", Icon: Crown },
  { label: "New", href: "/products?sort=newest", Icon: Sparkles },
];

/**
 * Mega-style primary nav with category + brand dropdowns. Sits below the
 * compact header (so the top row stays clean) and collapses into a slide-in
 * drawer on mobile.
 */
export default function PrimaryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<null | "categories" | "brands">(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loaded, setLoaded] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Lazy-fetch the catalog once a dropdown opens, then keep it cached
  useEffect(() => {
    if (!open || loaded) return;
    Promise.all([
      productApi.getCategories().catch(() => [] as Category[]),
      productApi.getBrands().catch(() => [] as Brand[]),
    ]).then(([c, b]) => {
      setCategories(c as Category[]);
      setBrands(b as Brand[]);
      setLoaded(true);
    });
  }, [open, loaded]);

  // Close dropdowns on outside-click and on route change
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!navRef.current || navRef.current.contains(e.target as Node)) return;
      setOpen(null);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);
  useEffect(() => {
    setOpen(null);
    setDrawerOpen(false);
  }, [pathname]);

  function go(query: string) {
    setOpen(null);
    router.push(query);
  }

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = String(data.get("q") || "").trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  return (
    <>
      <div
        ref={navRef}
        className="sticky top-20 z-30 border-b border-border bg-background/95 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-12 md:h-14 flex items-center gap-2 md:gap-4">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-[11px] font-medium uppercase tracking-wider hover:bg-surface transition-colors"
          >
            <Menu className="w-3.5 h-3.5" />
            Menu
          </button>

          {/* Desktop links + dropdowns */}
          <div className="hidden lg:flex items-center gap-1">
            <Trigger
              label="Categories"
              isOpen={open === "categories"}
              onClick={() => setOpen(open === "categories" ? null : "categories")}
            />
            <Trigger
              label="Brands"
              isOpen={open === "brands"}
              onClick={() => setOpen(open === "brands" ? null : "brands")}
            />
            {PRIMARY_LINKS.map(({ label, href, Icon }) => (
              <Link
                key={href + label}
                href={href}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-normal text-foreground/80 hover:text-foreground hover:bg-surface transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Search — inline on desktop, expands to full row */}
          <form
            onSubmit={onSearchSubmit}
            className="ml-auto flex-1 lg:flex-none lg:w-72 relative"
            role="search"
          >
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              name="q"
              type="search"
              inputMode="search"
              placeholder="Search Vendly…"
              className="h-9 w-full pl-9 pr-3 rounded-xl bg-surface border border-border text-[12px] font-normal outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </form>
        </div>

        {/* Mega dropdown panels */}
        <AnimatePresence>
          {open === "categories" && (
            <DropdownPanel onClose={() => setOpen(null)}>
              <CategoryMega categories={categories} loaded={loaded} go={go} />
            </DropdownPanel>
          )}
          {open === "brands" && (
            <DropdownPanel onClose={() => setOpen(null)}>
              <BrandMega brands={brands} loaded={loaded} go={go} />
            </DropdownPanel>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        brands={brands}
        ensureLoaded={() => {
          if (!loaded) setOpen("categories");
        }}
      />
    </>
  );
}

function Trigger({
  label,
  isOpen,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-normal transition-colors ${
        isOpen
          ? "bg-primary/10 text-primary"
          : "text-foreground/80 hover:text-foreground hover:bg-surface"
      }`}
    >
      {label}
      <ChevronDown
        className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function DropdownPanel({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      {...({
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.18 },
        className: "absolute left-0 right-0 top-full border-b border-border bg-background shadow-xl",
        onMouseLeave: onClose,
      } as HTMLMotionProps<"div">)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">{children}</div>
    </motion.div>
  );
}

function CategoryMega({
  categories,
  loaded,
  go,
}: {
  categories: Category[];
  loaded: boolean;
  go: (href: string) => void;
}) {
  if (!loaded) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-surface/60 animate-pulse" />
        ))}
      </div>
    );
  }
  if (categories.length === 0) {
    return <p className="text-[12px] text-muted">No categories yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((c) => (
        <button
          key={c.id || c.name}
          onClick={() => go(`/products?category=${encodeURIComponent(c.name)}`)}
          className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface/40 hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex-shrink-0 flex items-center justify-center">
            {c.image_url ? (
              <img src={c.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-primary" />
            )}
          </div>
          <span className="text-[12px] font-normal text-foreground group-hover:text-primary truncate flex-1">
            {c.name}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      ))}
    </div>
  );
}

function BrandMega({
  brands,
  loaded,
  go,
}: {
  brands: Brand[];
  loaded: boolean;
  go: (href: string) => void;
}) {
  if (!loaded) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-surface/60 animate-pulse" />
        ))}
      </div>
    );
  }
  if (brands.length === 0) {
    return <p className="text-[12px] text-muted">No brands yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {brands.map((b) => (
        <button
          key={b.id || b.name}
          onClick={() => go(`/products?brand=${encodeURIComponent(b.name)}`)}
          className="inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-border bg-surface/40 hover:bg-primary/5 hover:border-primary/30 text-[11px] font-normal text-foreground/80 hover:text-primary transition-colors"
        >
          {b.image_url ? (
            <img src={b.image_url} alt="" className="w-4 h-4 rounded object-cover" />
          ) : (
            <Store className="w-3.5 h-3.5 text-muted" />
          )}
          <span className="truncate">{b.name}</span>
        </button>
      ))}
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  categories,
  brands,
  ensureLoaded,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  brands: Brand[];
  ensureLoaded: () => void;
}) {
  const [tab, setTab] = useState<"main" | "categories" | "brands">("main");

  useEffect(() => {
    if (open) {
      ensureLoaded();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, ensureLoaded]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...({
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            className: "fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm lg:hidden",
            onClick: onClose,
          } as HTMLMotionProps<"div">)}
        >
          <motion.div
            {...({
              initial: { x: "-100%" },
              animate: { x: 0 },
              exit: { x: "-100%" },
              transition: { type: "spring", stiffness: 320, damping: 32 },
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              className: "absolute inset-y-0 left-0 w-full max-w-sm bg-background flex flex-col",
              role: "dialog",
              "aria-modal": true,
              "aria-label": "Navigation",
            } as HTMLMotionProps<"div">)}
          >
            <header className="h-16 px-5 flex items-center justify-between border-b border-border">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg overflow-hidden">
                  <img src="/logos/vendly.png" alt="" className="w-full h-full" />
                </div>
                <span className="text-base font-medium uppercase">Vendly</span>
              </Link>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-xl hover:bg-surface text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <nav className="flex-1 overflow-y-auto p-4">
              {tab === "main" && (
                <ul className="space-y-1">
                  <DrawerRow
                    icon={LayoutGrid}
                    label="Categories"
                    onClick={() => setTab("categories")}
                    chevron
                  />
                  <DrawerRow
                    icon={Store}
                    label="Brands"
                    onClick={() => setTab("brands")}
                    chevron
                  />
                  <div className="my-3 border-t border-border" />
                  {PRIMARY_LINKS.map(({ Icon, label, href }) => (
                    <DrawerRow
                      key={href}
                      icon={Icon}
                      label={label}
                      href={href}
                      onClick={onClose}
                    />
                  ))}
                  <div className="my-3 border-t border-border" />
                  <DrawerRow icon={ShoppingBag} label="My orders" href="/orders" onClick={onClose} />
                  <DrawerRow icon={TrendingUp} label="Sell on Vendly" href="/seller-verification" onClick={onClose} />
                  <DrawerRow icon={HelpCircle} label="Help & support" href="/help" onClick={onClose} />
                </ul>
              )}

              {tab !== "main" && (
                <div className="space-y-2">
                  <button
                    onClick={() => setTab("main")}
                    className="text-[11px] font-normal text-muted hover:text-foreground inline-flex items-center gap-1.5"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                    Back
                  </button>
                  {tab === "categories" && (
                    <ul className="space-y-1 pt-2">
                      {categories.length === 0
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="h-11 rounded-xl bg-surface/60 animate-pulse" />
                          ))
                        : categories.map((c) => (
                            <li key={c.id || c.name}>
                              <Link
                                href={`/products?category=${encodeURIComponent(c.name)}`}
                                onClick={onClose}
                                className="flex items-center justify-between px-3 h-11 rounded-xl hover:bg-surface text-[13px] font-normal text-foreground"
                              >
                                {c.name}
                                <ArrowRight className="w-3.5 h-3.5 text-muted" />
                              </Link>
                            </li>
                          ))}
                    </ul>
                  )}
                  {tab === "brands" && (
                    <ul className="space-y-1 pt-2">
                      {brands.length === 0
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="h-11 rounded-xl bg-surface/60 animate-pulse" />
                          ))
                        : brands.map((b) => (
                            <li key={b.id || b.name}>
                              <Link
                                href={`/products?brand=${encodeURIComponent(b.name)}`}
                                onClick={onClose}
                                className="flex items-center justify-between px-3 h-11 rounded-xl hover:bg-surface text-[13px] font-normal text-foreground"
                              >
                                {b.name}
                                <ArrowRight className="w-3.5 h-3.5 text-muted" />
                              </Link>
                            </li>
                          ))}
                    </ul>
                  )}
                </div>
              )}
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerRow({
  icon: Icon,
  label,
  href,
  onClick,
  chevron,
}: {
  icon: any;
  label: string;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const inner = (
    <>
      <span className="inline-flex w-9 h-9 rounded-xl bg-primary/10 text-primary items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 text-[13px] font-normal text-foreground">{label}</span>
      {chevron && <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted" />}
    </>
  );
  if (href) {
    return (
      <li>
        <Link
          href={href}
          onClick={onClick}
          className="flex items-center gap-3 px-2 h-12 rounded-xl hover:bg-surface transition-colors"
        >
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-2 h-12 rounded-xl hover:bg-surface transition-colors text-left"
      >
        {inner}
      </button>
    </li>
  );
}
