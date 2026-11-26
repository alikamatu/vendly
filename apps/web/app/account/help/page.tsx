'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  Send,
  Check,
  Loader2,
  Package,
  ShieldCheck,
  CreditCard,
  UserCircle,
  Store,
  Bug,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import Select from '@/components/ui/Select';
import { useAuth } from '@/lib/contexts/auth-context';
import { sanitizeText } from '@/lib/utils/sanitize';

const FAQS = [
  {
    icon: Package,
    tag: 'Orders',
    q: 'How do I track my order?',
    a: "Go to Account → My Orders (or visit /orders). Each order shows its status: Pending, Processing, Shipped, or Delivered. You can also tap the seller's store link to contact them directly.",
  },
  {
    icon: Store,
    tag: 'Selling',
    q: 'How do I become a seller on Verndly?',
    a: "Tap 'Become a Seller' from your Account page. You'll submit identity verification (National ID + proof of business). Our team reviews within 24–48 hours.",
  },
  {
    icon: CreditCard,
    tag: 'Payments',
    q: 'What payment methods are accepted?',
    a: "Verndly supports Mobile Money (MTN, Vodafone, AirtelTigo), bank transfers, and cash on delivery. Available methods depend on the seller's configuration at checkout.",
  },
  {
    icon: Lock,
    tag: 'Account',
    q: 'How do I reset or change my password?',
    a: "Go to Account → Password & Security. If you're locked out, use 'Forgot Password' on the login screen — we'll email a reset link.",
  },
  {
    icon: UserCircle,
    tag: 'Safety',
    q: 'How do I report a problem with a seller?',
    a: "Use the 'Report a Problem' form below. Select 'Seller Issue' as the topic. Our team reviews all reports within 2 business days.",
  },
  {
    icon: Mail,
    tag: 'Account',
    q: 'Can I change my email address?',
    a: "Email changes require identity verification for your protection. Contact support@verndly.com with your request and we'll guide you through it securely.",
  },
  {
    icon: Package,
    tag: 'Orders',
    q: 'How do I cancel or return an order?',
    a: 'Contact the seller directly via WhatsApp or their store page. Return and cancellation policies are set individually by each seller.',
  },
  {
    icon: ShieldCheck,
    tag: 'Privacy',
    q: 'Is my personal information safe?',
    a: 'Yes — Verndly encrypts all data in transit (TLS) and at rest. We never sell personal data. See our full privacy policy in Terms & Conditions.',
  },
];

const CONTACTS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    desc: 'Fastest · Mon–Sat 8am–8pm',
    icon: MessageCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    href: 'https://wa.me/233534065652?text=Hi%20Verndly%20Support',
  },
  {
    id: 'email',
    label: 'Email Support',
    desc: 'support@verndly.com · within 24h',
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    href: 'mailto:support@verndly.com',
  },
  {
    id: 'phone',
    label: 'Call Us',
    desc: '+233 53 406 5652 · Mon–Sat 8am–8pm',
    icon: Phone,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    href: 'tel:+233534065652',
  },
];

const TOPICS = [
  'Order Issue',
  'Seller Issue',
  'Payment Problem',
  'Account Problem',
  'App Bug / Error',
  'Safety Concern',
  'Feature Request',
  'Other',
] as const;

function FaqItem({ item }: { item: (typeof FAQS)[number] }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <div className="border-[var(--color-border)]/60 border-b last:border-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-background)]"
      >
        <div className="bg-[var(--color-border)]/50 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-3.5 w-3.5 text-[var(--color-muted)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-normal leading-snug text-[var(--color-foreground)]">
            {item.q}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {item.tag}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pl-[3.75rem] pt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportForm() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || body.trim().length < 10) return;
    setLoading(true);
    const clean = sanitizeText(body, 1000);
    const sub = encodeURIComponent(`[Verndly Support] ${topic}`);
    const msg = encodeURIComponent(
      `From: ${user?.full_name ?? 'Guest'} <${user?.email ?? ''}>\nTopic: ${topic}\n\n${clean}`,
    );
    window.location.href = `mailto:support@verndly.com?subject=${sub}&body=${msg}`;
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 600);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
          <Check className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="text-sm font-medium">Report submitted</p>
        <p className="max-w-xs text-[11px] text-[var(--color-muted)]">
          Your email client should have opened. If not, email us directly at{' '}
          <a
            href="mailto:support@verndly.com"
            className="font-normal text-[var(--color-accent)] underline"
          >
            support@verndly.com
          </a>
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setTopic('');
            setBody('');
          }}
          className="mt-1 text-[11px] font-normal text-[var(--color-muted)] underline hover:text-[var(--color-foreground)]"
        >
          Send another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Select
          value={topic}
          onChange={(val) => setTopic(val)}
          options={TOPICS.map((t) => ({ value: t, label: t }))}
          placeholder="Select a topic…"
        />
      </div>

      <div className="relative">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe the issue in detail. Include order numbers, store names, or screenshots if helpful…"
          rows={5}
          maxLength={1000}
          required
          className={[
            'w-full rounded-2xl border border-[var(--color-border)] px-4 py-3',
            'bg-[var(--color-background)] text-base text-[var(--color-foreground)]',
            'placeholder:text-[var(--color-muted)]/50 resize-none',
            'focus:ring-[var(--color-accent)]/15 outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2',
          ].join(' ')}
        />
        <span className="pointer-events-none absolute bottom-3 right-4 text-[10px] tabular-nums text-[var(--color-muted)]">
          {body.length}/1000
        </span>
      </div>

      <button
        type="submit"
        disabled={loading || !topic || body.trim().length < 10}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-foreground)] text-xs font-medium uppercase tracking-wider text-[var(--color-background)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit Report
          </>
        )}
      </button>
    </form>
  );
}

function Section({
  label,
  icon: Icon,
  iconBg,
  iconColor,
  children,
}: {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1">
        <div className={`flex h-5 w-5 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-3 w-3 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {children}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      <Link
        href="/account"
        className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Help & Support</h1>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          Find answers, contact us, or report a problem
        </p>
      </div>

      <Section
        label="Contact Us"
        icon={MessageCircle}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
      >
        <div className="divide-[var(--color-border)]/50 divide-y">
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              target={c.id !== 'phone' ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="active:bg-[var(--color-border)]/20 group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[var(--color-background)]"
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${c.bg}`}
              >
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal text-[var(--color-foreground)]">{c.label}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{c.desc}</p>
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0 -rotate-90 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-foreground)]" />
            </a>
          ))}
        </div>
      </Section>

      <Section
        label="Frequently Asked Questions"
        icon={HelpCircle}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-500"
      >
        {FAQS.map((item, i) => (
          <FaqItem key={i} item={item} />
        ))}
      </Section>

      <Section
        label="Report a Problem"
        icon={Bug}
        iconBg="bg-rose-500/10"
        iconColor="text-rose-500"
      >
        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
            Something broken or someone misbehaving? Let us know — reports are reviewed within 2
            business days.
          </p>
          <ReportForm />
        </div>
      </Section>

      <p className="text-center text-[10px] text-[var(--color-muted)]">
        support@verndly.com · Verndly v1.0
      </p>
    </div>
  );
}
