'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { contactApi } from '@/lib/api/contact';
import Spinner from '@/components/ui/Spinner';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const SHOP_LINKS: FooterLink[] = [
  { label: 'All Products', href: '/products' },
  { label: 'Categories', href: '/categories' },
  { label: 'Top Deals', href: '/products?has_discount=1' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Verified Stores', href: '/stores' },
];

const SELL_LINKS: FooterLink[] = [
  { label: 'Start Selling', href: '/seller-verification' },
  { label: 'Seller Dashboard', href: '/dashboard' },
  { label: 'Pro Membership', href: '/dashboard/settings' },
  { label: 'Seller Guidelines', href: '/dashboard/settings/terms' },
];

const SUPPORT_LINKS: FooterLink[] = [
  { label: 'Help Center', href: '/help' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Buyer Protection', href: '/returns' },
  { label: 'Shipping & Rates', href: '/shipping' },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Returns & Refunds', href: '/returns' },
  { label: 'Shipping Policy', href: '/shipping' },
  { label: 'Payment Security', href: '/account/security' },
];

const SOCIALS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/233534065652?text=Hello%20Verndly%20Support',
    Icon: MessageSquare,
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/verndly',
    Icon: Instagram,
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/verndly',
    Icon: Twitter,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/verndly',
    Icon: Linkedin,
  },
];

const TRUST_METRICS = [
  {
    Icon: ShieldCheck,
    title: 'Escrow Protection',
    desc: 'Payments held safely until order confirmation',
  },
  {
    Icon: Percent,
    title: 'Transparent 4% Fee',
    desc: 'Fair platform fee for sellers, zero buyer surcharges',
  },
  {
    Icon: UserCheck,
    title: 'Verified Merchants',
    desc: 'Every young entrepreneur vetted and verified',
  },
  {
    Icon: Truck,
    title: 'Nationwide Dispatch',
    desc: 'Fast, door-to-door delivery across all regions',
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border bg-surface/30 text-foreground border-t">
      {/* Trust & Guarantees Banner */}
      <div className="border-border/60 bg-surface/20 border-b">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_METRICS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-foreground text-xs font-semibold tracking-tight">{title}</h4>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Brand & Direct Admin Support Channels */}
          <div className="space-y-6 lg:col-span-5">
            <div className="space-y-3">
              <Link href="/" className="group inline-flex items-center gap-2.5">
                <img
                  src="/logos/verndly.png"
                  alt="Verndly"
                  className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                />
                <span className="text-foreground text-lg font-bold uppercase tracking-tight">
                  Verndly
                </span>
              </Link>
              <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                The modern marketplace built for verified young entrepreneurs and independent
                brands. Buy with escrow protection, sell nationwide, and scale your business.
              </p>
            </div>

            {/* Direct Admin Support Information Card */}
            <div className="border-border/70 bg-surface/50 space-y-4 rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Direct Support &amp; Administration
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Active Support
                </span>
              </div>

              {/* 2-column channel links for WhatsApp and Calls */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <a
                  href="https://wa.me/233534065652?text=Hello%20Verndly%20Support"
                  target="_blank"
                  rel="noreferrer"
                  className="border-border/60 bg-background/60 hover:bg-background text-foreground group flex items-center gap-2.5 rounded-xl border p-2.5 transition-all hover:border-emerald-500/40"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-[11px] font-medium leading-none">
                      +233 53 406 5652
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px] transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      WhatsApp Direct
                    </p>
                  </div>
                </a>

                <a
                  href="tel:+233534065652"
                  className="border-border/60 bg-background/60 hover:bg-background hover:border-primary/40 text-foreground group flex items-center gap-2.5 rounded-xl border p-2.5 transition-all"
                >
                  <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                    <Phone className="text-primary h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-[11px] font-medium leading-none">
                      +233 53 406 5652
                    </p>
                    <p className="text-muted-foreground group-hover:text-primary mt-1 text-[10px] transition-colors">
                      Voice Calls
                    </p>
                  </div>
                </a>
              </div>

              {/* Email and Operation Info */}
              <div className="border-border/40 space-y-2 border-t pt-3 text-xs">
                <a
                  href="mailto:alikamatu14@gmail.com"
                  className="text-muted-foreground hover:text-primary group flex items-center justify-between py-0.5 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span className="text-foreground text-xs font-medium">
                      alikamatu14@gmail.com
                    </span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </a>

                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Mon – Sat: 8:00 AM – 8:00 PM GMT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>Accra, Ghana</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2.5 pt-1">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="border-border/70 bg-surface text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 flex h-9 w-9 items-center justify-center rounded-xl border transition-all"
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:col-span-4">
            <LinkColumn title="Marketplace" links={SHOP_LINKS} />
            <LinkColumn title="Sellers" links={SELL_LINKS} />
            <div className="col-span-2 space-y-6 sm:col-span-1">
              <LinkColumn title="Support" links={SUPPORT_LINKS} />
              <LinkColumn title="Legal" links={LEGAL_LINKS} />
            </div>
          </div>

          {/* Production-Ready Newsletter Form */}
          <div className="lg:col-span-3">
            <div className="border-border/80 bg-surface/60 space-y-4 rounded-3xl border p-6">
              <div className="space-y-1">
                <span className="text-primary text-[10px] font-semibold uppercase tracking-wider">
                  Marketplace Updates
                </span>
                <h3 className="text-foreground text-sm font-bold">Stay Ahead in Business</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Get curated product drops, seller tips, and verified vendor highlights.
                </p>
              </div>

              <NewsletterSubscriptionForm />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Operational Bar */}
      <div className="border-border/60 bg-surface/50 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs sm:flex-row md:px-8">
          <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
            <span>© {currentYear} Verndly Technologies. All rights reserved.</span>
            <span className="text-border hidden sm:inline">•</span>
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

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-foreground/80 inline-flex items-center gap-1.5 font-medium">
              <Globe className="text-primary h-3.5 w-3.5" />
              Ghana · GH₵ (GHS) · English
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
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
      <h4 className="text-foreground text-[11px] font-bold uppercase tracking-wider">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
            >
              <span>{link.label}</span>
              {link.external && <ArrowUpRight className="h-3 w-3 opacity-60" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterSubscriptionForm() {
  const [email, setEmail] = useState('');
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
      setValidationError('Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmed)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await contactApi.subscribeNewsletter(trimmed);

      const isExisting = res?.status === 'already_subscribed';
      setResult({
        success: true,
        status: res?.status,
        message: isExisting
          ? 'You are already subscribed to Verndly updates.'
          : 'Subscription confirmed. Thank you for joining.',
      });
      setEmail('');
    } catch (err: any) {
      setResult({
        success: false,
        message:
          err?.response?.data?.message || 'Unable to subscribe right now. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result?.success) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{result.message}</p>
            <p className="text-muted-foreground text-[11px] leading-normal">
              {result.status === 'already_subscribed'
                ? 'Your email is currently active on our subscriber list.'
                : 'You will receive updates, product drops, and verified seller highlights.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="text-primary text-[11px] font-medium hover:underline"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <label htmlFor="footer-newsletter-email" className="sr-only">
          Email address
        </label>
        <div className="relative">
          <Mail className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
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
            className={`bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/20 h-11 w-full rounded-xl border pl-10 pr-4 text-xs outline-none transition-all focus:ring-2 ${
              validationError || result?.success === false ? 'border-red-500/60' : 'border-border'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isSubmitting ? (
            <>
              <Spinner size="xs" />
              <span>Subscribing...</span>
            </>
          ) : (
            <>
              <span>Subscribe to Updates</span>
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </button>
        {validationError && (
          <p className="flex items-center gap-1 pt-0.5 text-[11px] font-medium text-red-500">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}

        {result && !result.success && (
          <p className="flex items-center gap-1 pt-0.5 text-[11px] font-medium text-red-500">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{result.message}</span>
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-[11px] leading-snug">
        We respect your privacy. No spam. You can unsubscribe at any time.
      </p>
    </form>
  );
}
