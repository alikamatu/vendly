"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  Percent,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
} from "lucide-react";
import { contactApi } from "@/lib/api/contact";
import Spinner from "@/components/ui/Spinner";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const SHOP_LINKS: FooterLink[] = [
  { label: "All Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Top Deals", href: "/products?has_discount=1" },
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Verified Stores", href: "/stores" },
];

const SELL_LINKS: FooterLink[] = [
  { label: "Start Selling", href: "/seller-verification" },
  { label: "Seller Dashboard", href: "/dashboard" },
  { label: "Pro Membership", href: "/dashboard/settings" },
  { label: "Seller Guidelines", href: "/dashboard/settings/terms" },
];

const SUPPORT_LINKS: FooterLink[] = [
  { label: "Help Center", href: "/help" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Buyer Protection", href: "/returns" },
  { label: "Shipping & Rates", href: "/shipping" },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Payment Security", href: "/account/security" },
];

const SOCIALS = [
  {
    label: "WhatsApp",
    href: "https://wa.me/233534065652?text=Hello%20Verndly%20Support",
    Icon: MessageSquare,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/verndly",
    Icon: Instagram,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/verndly",
    Icon: Twitter,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/verndly",
    Icon: Linkedin,
  },
];

const TRUST_METRICS = [
  {
    Icon: ShieldCheck,
    title: "Escrow Protection",
    desc: "Payments held safely until order confirmation",
  },
  {
    Icon: Percent,
    title: "Transparent 4% Fee",
    desc: "Fair platform fee for sellers, zero buyer surcharges",
  },
  {
    Icon: UserCheck,
    title: "Verified Merchants",
    desc: "Every young entrepreneur vetted and verified",
  },
  {
    Icon: Truck,
    title: "Nationwide Dispatch",
    desc: "Fast, door-to-door delivery across all regions",
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface/30 text-foreground">
      {/* Trust & Guarantees Banner */}
      <div className="border-b border-border/60 bg-surface/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_METRICS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">
                    {title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand & Direct Admin Support Channels */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <img
                  src="/logos/verndly.png"
                  alt="Verndly"
                  className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
                />
                <span className="text-lg font-bold uppercase tracking-tight text-foreground">
                  Verndly
                </span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                The modern marketplace built for verified young entrepreneurs and independent
                brands. Buy with escrow protection, sell nationwide, and scale your business.
              </p>
            </div>

            {/* Direct Admin Support Information Card */}
            <div className="p-4 rounded-2xl border border-border/70 bg-surface/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Support &amp; Administration
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Support
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <a
                  href="https://wa.me/233534065652?text=Hello%20Verndly%20Support"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium">+233 53 406 5652</span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                    (WhatsApp Direct)
                  </span>
                </a>

                <a
                  href="tel:+233534065652"
                  className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors group"
                >
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium">+233 53 406 5652</span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                    (Voice Calls)
                  </span>
                </a>

                <a
                  href="mailto:alikamatu14@gmail.com"
                  className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-medium truncate">alikamatu14@gmail.com</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                <div className="flex items-center gap-2.5 text-muted-foreground text-[11px] pt-1 border-t border-border/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Mon – Sat: 8:00 AM – 8:00 PM GMT</span>
                </div>

                <div className="flex items-center gap-2.5 text-muted-foreground text-[11px]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Accra, Ghana</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 pt-1">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-border/70 bg-surface flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
            <LinkColumn title="Marketplace" links={SHOP_LINKS} />
            <LinkColumn title="Sellers" links={SELL_LINKS} />
            <div className="col-span-2 sm:col-span-1 space-y-6">
              <LinkColumn title="Support" links={SUPPORT_LINKS} />
              <LinkColumn title="Legal" links={LEGAL_LINKS} />
            </div>
          </div>

          {/* Production-Ready Newsletter Form */}
          <div className="lg:col-span-3">
            <div className="p-6 rounded-3xl border border-border/80 bg-surface/60 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Marketplace Updates
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Stay Ahead in Business
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get curated product drops, seller tips, and verified vendor highlights.
                </p>
              </div>

              <NewsletterSubscriptionForm />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Operational Bar */}
      <div className="border-t border-border/60 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
            <span>© {currentYear} Verndly Technologies. All rights reserved.</span>
            <span className="hidden sm:inline text-border">•</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-border">•</span>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="text-border">•</span>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Contact Support
            </Link>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              <Globe className="w-3.5 h-3.5 text-primary" />
              Ghana · GH₵ (GHS) · English
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              Secured by Paystack &amp; Escrow
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span>{link.label}</span>
              {link.external && <ArrowUpRight className="w-3 h-3 opacity-60" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    status?: string;
    message: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setValidationError(null);
    const trimmed = email.trim();

    if (!trimmed) {
      setValidationError("Please enter your email address.");
      return;
    }

    if (!validateEmail(trimmed)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await contactApi.subscribeNewsletter(trimmed);
      
      const isExisting = res?.status === "already_subscribed";
      setResult({
        success: true,
        status: res?.status,
        message: isExisting
          ? "You are already subscribed to Verndly updates."
          : "Subscription confirmed. Thank you for joining.",
      });
      setEmail("");
    } catch (err: any) {
      setResult({
        success: false,
        message:
          err?.response?.data?.message ||
          "Unable to subscribe right now. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result?.success) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">{result.message}</p>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {result.status === "already_subscribed"
                ? "Your email is currently active on our subscriber list."
                : "You will receive updates, product drops, and verified seller highlights."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="footer-newsletter-email" className="sr-only">
          Email address
        </label>
        <div className="relative flex items-center">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            id="footer-newsletter-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError(null);
              if (result) setResult(null);
            }}
            disabled={isSubmitting}
            className={`w-full h-11 pl-10 pr-28 rounded-2xl bg-background border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
              validationError || result?.success === false
                ? "border-red-500/60"
                : "border-border"
            }`}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="absolute right-1 top-1 bottom-1 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-none border-0"
          >
            {isSubmitting ? (
              <>
                <Spinner size="xs" />
                <span>Saving</span>
              </>
            ) : (
              <>
                <span>Subscribe</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

        {validationError && (
          <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium pt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}

        {result && !result.success && (
          <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium pt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{result.message}</span>
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        We respect your privacy. No spam. You can unsubscribe at any time.
      </p>
    </form>
  );
}
