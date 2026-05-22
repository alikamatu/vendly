"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Mail,
  Send,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  ShieldCheck,
  Truck,
  Lock,
  HelpCircle,
  Globe,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const SHOP_LINKS: FooterLink[] = [
  { label: "All products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Top deals", href: "/products?has_discount=1" },
  { label: "New arrivals", href: "/products?sort=newest" },
];

const SELL_LINKS: FooterLink[] = [
  { label: "Start selling", href: "/seller-verification" },
  { label: "Seller dashboard", href: "/dashboard" },
  { label: "Pro membership", href: "/dashboard/settings" },
  { label: "Seller policies", href: "/dashboard/settings/terms" },
];

const COMPANY_LINKS: FooterLink[] = [
  { label: "About Vendly", href: "/about" },
  { label: "Contact us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Help center", href: "/help" },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Shipping & delivery", href: "/shipping" },
  { label: "Returns & refunds", href: "/returns" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/vendly", Icon: Instagram },
  { label: "Twitter / X", href: "https://twitter.com/vendly", Icon: Twitter },
  { label: "Facebook", href: "https://facebook.com/vendly", Icon: Facebook },
  { label: "YouTube", href: "https://youtube.com/@vendly", Icon: Youtube },
];

const TRUST = [
  { Icon: ShieldCheck, label: "Buyer protection" },
  { Icon: Truck, label: "Nationwide delivery" },
  { Icon: Lock, label: "Secure checkout" },
  { Icon: HelpCircle, label: "24/7 support" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      {/* Trust bar */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {TRUST.map(({ Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 text-[12px] font-bold text-foreground"
              >
                <span className="inline-flex w-9 h-9 rounded-2xl items-center justify-center bg-primary/10 text-primary">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-8 md:pt-14 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                <img src="/logos/vendly.png" alt="Vendly" className="w-full h-full" />
              </div>
              <span className="text-lg font-black uppercase tracking-tight text-foreground">
                Vendly
              </span>
            </Link>
            <p className="text-[13px] text-muted leading-relaxed max-w-sm">
              The campus marketplace for verified student entrepreneurs. Shop, sell,
              and grow — all in one place.
            </p>
            <NewsletterForm />
            <div className="flex items-center gap-2 pt-1">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex w-9 h-9 rounded-xl items-center justify-center border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <LinkGroup title="Shop" links={SHOP_LINKS} />
            <LinkGroup title="Sell" links={SELL_LINKS} />
            <LinkGroup title="Company" links={COMPANY_LINKS} />
            <LinkGroup title="Legal" links={LEGAL_LINKS} />
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-muted">
          <p className="font-bold">
            © {new Date().getFullYear()} Vendly. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Globe className="w-3.5 h-3.5" />
              Ghana · English (GH)
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Made for campuses
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{title}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-1 text-[12px] text-foreground/80 hover:text-primary transition-colors"
            >
              {l.label}
              {l.external && <ArrowUpRight className="w-3 h-3 opacity-60" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look right.");
      return;
    }
    setSubmitted(true);
    setEmail("");
  }

  if (submitted) {
    return (
      <div className="inline-flex items-center gap-2 px-3 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        You're on the list — we'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="footer-newsletter" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted block">
        Newsletter
      </label>
      <div className="relative flex items-center">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
        <input
          id="footer-newsletter"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={!!error}
          className={`flex-1 h-10 pl-9 pr-24 rounded-2xl bg-background border text-[12px] font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
            error ? "border-red-500/50" : "border-border"
          }`}
        />
        <button
          type="submit"
          className="absolute right-1 top-1 bottom-1 px-3 inline-flex items-center gap-1 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          <Send className="w-3 h-3" />
          Subscribe
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 px-1">{error}</p>}
      <p className="text-[10px] text-muted leading-snug">
        Get launches, deals, and seller tips. No spam — unsubscribe anytime.
      </p>
    </form>
  );
}
