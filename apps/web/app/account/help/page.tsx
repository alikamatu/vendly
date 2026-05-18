"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { sanitizeText } from "@/lib/utils/sanitize";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    icon: Package,
    tag: "Orders",
    q: "How do I track my order?",
    a: "Go to Account → My Orders (or visit /orders). Each order shows its status: Pending, Processing, Shipped, or Delivered. You can also tap the seller's store link to contact them directly.",
  },
  {
    icon: Store,
    tag: "Selling",
    q: "How do I become a seller on Vendly?",
    a: "Tap 'Become a Seller' from your Account page. You'll submit identity verification (National ID + proof of business). Our team reviews within 24–48 hours.",
  },
  {
    icon: CreditCard,
    tag: "Payments",
    q: "What payment methods are accepted?",
    a: "Vendly supports Mobile Money (MTN, Vodafone, AirtelTigo), bank transfers, and cash on delivery. Available methods depend on the seller's configuration at checkout.",
  },
  {
    icon: Lock,
    tag: "Account",
    q: "How do I reset or change my password?",
    a: "Go to Account → Password & Security. If you're locked out, use 'Forgot Password' on the login screen — we'll email a reset link.",
  },
  {
    icon: UserCircle,
    tag: "Safety",
    q: "How do I report a problem with a seller?",
    a: "Use the 'Report a Problem' form below. Select 'Seller Issue' as the topic. Our team reviews all reports within 2 business days.",
  },
  {
    icon: Mail,
    tag: "Account",
    q: "Can I change my email address?",
    a: "Email changes require identity verification for your protection. Contact support@vendly.app with your request and we'll guide you through it securely.",
  },
  {
    icon: Package,
    tag: "Orders",
    q: "How do I cancel or return an order?",
    a: "Contact the seller directly via WhatsApp or their store page. Return and cancellation policies are set individually by each seller.",
  },
  {
    icon: ShieldCheck,
    tag: "Privacy",
    q: "Is my personal information safe?",
    a: "Yes — Vendly encrypts all data in transit (TLS) and at rest. We never sell personal data. See our full privacy policy in Terms & Conditions.",
  },
];

const CONTACTS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Fastest · Mon–Fri 8am–8pm",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    href: "https://wa.me/233000000000?text=Hi%20Vendly%20Support",
  },
  {
    id: "email",
    label: "Email Support",
    desc: "support@vendly.app · within 24h",
    icon: Mail,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    href: "mailto:support@vendly.app",
  },
  {
    id: "phone",
    label: "Call Us",
    desc: "+233 00 000 0000 · Mon–Fri 9–5",
    icon: Phone,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    href: "tel:+233000000000",
  },
];

const TOPICS = [
  "Order Issue",
  "Seller Issue",
  "Payment Problem",
  "Account Problem",
  "App Bug / Error",
  "Safety Concern",
  "Feature Request",
  "Other",
] as const;

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FaqItem({ item }: { item: (typeof FAQS)[number] }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <div className="border-b border-[var(--color-border)]/60 last:border-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--color-background)] transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-[var(--color-border)]/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-[var(--color-muted)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[var(--color-foreground)] leading-snug">{item.q}</p>
          <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-wide">{item.tag}</p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pt-0.5 text-[12px] text-[var(--color-muted)] leading-relaxed pl-[3.75rem]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Report form ──────────────────────────────────────────────────────────────

function ReportForm() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || body.trim().length < 10) return;
    setLoading(true);
    const clean = sanitizeText(body, 1000);
    const sub = encodeURIComponent(`[Vendly Support] ${topic}`);
    const msg = encodeURIComponent(
      `From: ${user?.full_name ?? "Guest"} <${user?.email ?? ""}>\nTopic: ${topic}\n\n${clean}`
    );
    window.location.href = `mailto:support@vendly.app?subject=${sub}&body=${msg}`;
    setTimeout(() => { setSent(true); setLoading(false); }, 600);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-sm font-black">Report submitted</p>
        <p className="text-[11px] text-[var(--color-muted)] max-w-xs">
          Your email client should have opened. If not, email us directly at{" "}
          <a href="mailto:support@vendly.app" className="font-bold text-[var(--color-accent)] underline">
            support@vendly.app
          </a>
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setTopic(""); setBody(""); }}
          className="text-[11px] font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] underline mt-1"
        >
          Send another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className={[
            "w-full h-12 px-4 rounded-2xl border border-[var(--color-border)] appearance-none",
            "bg-[var(--color-background)] text-base text-[var(--color-foreground)]",
            "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-all",
            !topic ? "text-[var(--color-muted)]" : "",
          ].join(" ")}
        >
          <option value="" disabled>Select a topic…</option>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
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
            "w-full px-4 py-3 rounded-2xl border border-[var(--color-border)]",
            "bg-[var(--color-background)] text-[var(--color-foreground)] text-base",
            "placeholder:text-[var(--color-muted)]/50 resize-none",
            "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-all",
          ].join(" ")}
        />
        <span className="absolute bottom-3 right-4 text-[10px] text-[var(--color-muted)] tabular-nums pointer-events-none">
          {body.length}/1000
        </span>
      </div>

      <button
        type="submit"
        disabled={loading || !topic || body.trim().length < 10}
        className="w-full h-12 rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] font-black uppercase tracking-widest text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="w-4 h-4" /> Submit Report</>
        )}
      </button>
    </form>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

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
        <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3 h-3 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest">{label}</p>
      </div>
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[11px] font-black text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-widest transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-black tracking-tight">Help & Support</h1>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Find answers, contact us, or report a problem</p>
      </div>

      {/* Contact */}
      <Section label="Contact Us" icon={MessageCircle} iconBg="bg-emerald-500/10" iconColor="text-emerald-500">
        <div className="divide-y divide-[var(--color-border)]/50">
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              target={c.id !== "phone" ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[var(--color-background)] active:bg-[var(--color-border)]/20 transition-colors group"
            >
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[var(--color-foreground)]">{c.label}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{c.desc}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--color-muted)] -rotate-90 flex-shrink-0 group-hover:text-[var(--color-foreground)] transition-colors" />
            </a>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section label="Frequently Asked Questions" icon={HelpCircle} iconBg="bg-blue-500/10" iconColor="text-blue-500">
        {FAQS.map((item, i) => <FaqItem key={i} item={item} />)}
      </Section>

      {/* Report */}
      <Section label="Report a Problem" icon={Bug} iconBg="bg-rose-500/10" iconColor="text-rose-500">
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Something broken or someone misbehaving? Let us know — reports are reviewed within 2 business days.
          </p>
          <ReportForm />
        </div>
      </Section>

      <p className="text-center text-[10px] text-[var(--color-muted)]">
        support@vendly.app · Vendly v1.0
      </p>
    </div>
  );
}
