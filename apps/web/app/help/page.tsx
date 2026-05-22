import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  CreditCard,
  Truck,
  ShieldCheck,
  Sparkles,
  Mail,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export const metadata: Metadata = {
  title: "Help Center · Vendly",
  description: "Guides, policies, and support for everything Vendly.",
};

const SECTIONS = [
  {
    title: "Buying",
    Icon: ShoppingBag,
    description: "Find items, place orders, and track delivery.",
    links: [
      { label: "Browsing & search", href: "/products" },
      { label: "Placing an order", href: "/faq" },
      { label: "Tracking your order", href: "/orders" },
      { label: "Shipping & delivery", href: "/shipping" },
    ],
  },
  {
    title: "Selling",
    Icon: Store,
    description: "Open your store, list products, manage orders.",
    links: [
      { label: "Become a seller", href: "/seller-verification" },
      { label: "Seller dashboard", href: "/dashboard" },
      { label: "Listing best practices", href: "/faq" },
      { label: "Pro membership", href: "/dashboard/settings" },
    ],
  },
  {
    title: "Payments & payouts",
    Icon: CreditCard,
    description: "How money moves on Vendly.",
    links: [
      { label: "Payment methods", href: "/faq" },
      { label: "Seller payouts", href: "/dashboard/payouts" },
      { label: "Refunds", href: "/returns" },
    ],
  },
  {
    title: "Delivery",
    Icon: Truck,
    description: "Pickup, delivery, and service areas.",
    links: [
      { label: "Service areas", href: "/shipping" },
      { label: "Delivery times", href: "/shipping" },
      { label: "Pickup option", href: "/shipping" },
    ],
  },
  {
    title: "Trust & safety",
    Icon: ShieldCheck,
    description: "Buyer protection and how we keep Vendly safe.",
    links: [
      { label: "Buyer protection", href: "/returns" },
      { label: "Reporting an issue", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
  {
    title: "Pro features",
    Icon: Sparkles,
    description: "Get the most out of Vendly Pro.",
    links: [
      { label: "What's included", href: "/dashboard/settings" },
      { label: "Storefront QR code", href: "/dashboard" },
      { label: "Featured placement", href: "/dashboard" },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Help Center" />

      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 md:pb-32 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            Support
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            How can we help?
          </h1>
          <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl mx-auto">
            Browse guides by topic, find quick answers in the FAQ, or reach out to a
            human — we usually reply within 24 hours.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map(({ title, Icon, description, links }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-surface/40 p-5 md:p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex w-11 h-11 rounded-2xl items-center justify-center bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
                  <p className="text-[11px] text-muted leading-snug">{description}</p>
                </div>
              </div>
              <ul className="space-y-1.5 pt-1">
                {links.map((l) => (
                  <li key={l.label + l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-foreground/80 hover:text-primary transition-colors"
                    >
                      {l.label}
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold tracking-tight">
              Still need a hand?
            </h3>
            <p className="text-[12px] text-muted">
              We usually reply within 24 hours. For urgent order issues, WhatsApp us.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-2xl border border-border bg-surface text-[11px] font-black uppercase tracking-widest hover:bg-background transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Browse FAQ
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
