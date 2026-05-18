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
  AlertCircle,
  Loader2,
  Package,
  ShieldCheck,
  CreditCard,
  UserCircle,
  Store,
  Bug,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { sanitizeText } from "@/lib/utils/sanitize";

// ─── FAQ data ─────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
  icon: React.ElementType;
  tag: string;
}

const FAQS: FaqItem[] = [
  {
    q: "How do I track my order?",
    a: "Go to My Orders from the Settings menu or visit the Orders page. Each order shows its current status — Pending, Processing, Shipped, or Delivered. You can also see the seller's contact details to follow up directly.",
    icon: Package,
    tag: "Orders",
  },
  {
    q: "How do I become a seller on Vendly?",
    a: "Tap 'Become a Seller' in your Settings. You'll need to complete identity verification by submitting a National ID and proof of business activity. Our team reviews applications within 24–48 hours.",
    icon: Store,
    tag: "Selling",
  },
  {
    q: "What payment methods are accepted?",
    a: "Vendly accepts Mobile Money (MTN, Vodafone, AirtelTigo), bank transfer, and cash on delivery depending on the seller's settings. You'll see available payment options at checkout.",
    icon: CreditCard,
    tag: "Payments",
  },
  {
    q: "How do I reset or change my password?",
    a: "Go to Settings → Password & Security and use the Change Password form. If you're locked out, use 'Forgot Password' on the login screen and we'll send a reset link to your email.",
    icon: ShieldCheck,
    tag: "Account",
  },
  {
    q: "How do I report a problem with a seller?",
    a: "Use the 'Report a Problem' form below and select 'Seller Issue' as the topic. Include the seller's store name and a description of what happened. Our support team will investigate within 2 business days.",
    icon: UserCircle,
    tag: "Safety",
  },
  {
    q: "Can I change my email address?",
    a: "Email changes require identity verification to protect your account. Please contact our support team via the form below or by emailing support@vendly.app. We'll guide you through the process securely.",
    icon: Mail,
    tag: "Account",
  },
  {
    q: "How do I cancel or return an order?",
    a: "Contact the seller directly via their WhatsApp or store page to request a cancellation or return. Our platform currently facilitates buyer–seller communication; cancellation policies vary per seller.",
    icon: Package,
    tag: "Orders",
  },
  {
    q: "Is my personal information safe?",
    a: "Yes. Vendly encrypts your data in transit (TLS) and at rest. We never sell your personal data to third parties. You can review our full privacy policy in the Terms & Conditions section.",
    icon: ShieldCheck,
    tag: "Privacy",
  },
];

// ─── Contact options ──────────────────────────────────────────────────────────

const CONTACT_OPTIONS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Fastest response · Mon–Fri 8am–8pm",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    href: "https://wa.me/233000000000?text=Hi%20Vendly%20Support",
  },
  {
    id: "email",
    label: "Email Support",
    desc: "support@vendly.app · within 24hrs",
    icon: Mail,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    href: "mailto:support@vendly.app",
  },
  {
    id: "phone",
    label: "Call Us",
    desc: "+233 00 000 0000 · Mon–Fri 9am–5pm",
    icon: Phone,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    href: "tel:+233000000000",
  },
];

const REPORT_TOPICS = [
  "Order Issue",
  "Seller Issue",
  "Payment Problem",
  "Account Problem",
  "App Bug / Error",
  "Safety Concern",
  "Feature Request",
  "Other",
] as const;

// ─── FAQ Accordion item ───────────────────────────────────────────────────────

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <div className="border-b border-[var(--color-border)]/60 last:border-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--color-surface)] transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-[var(--color-border)]/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-[var(--color-muted)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--color-foreground)] leading-snug">{item.q}</p>
          <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wide">{item.tag}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 pt-1 text-[12px] text-[var(--color-muted)] leading-relaxed pl-[3.75rem]">
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
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !message.trim()) return;

    const cleanMessage = sanitizeText(message, 1000);
    if (cleanMessage.length < 10) return;

    setStatus("sending");

    // Build a mailto: link as the submission mechanism (no dedicated
    // report API exists yet — degrades gracefully and still works).
    const body = encodeURIComponent(
      `From: ${user?.full_name ?? "Guest"} <${user?.email ?? ""}>\nTopic: ${topic}\n\n${cleanMessage}`
    );
    const subject = encodeURIComponent(`[Vendly Support] ${topic}`);
    window.location.href = `mailto:support@vendly.app?subject=${subject}&body=${body}`;

    // Optimistic success
    setTimeout(() => {
      setStatus("sent");
      setTopic("");
      setMessage("");
    }, 600);
  };

  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-base font-black text-[var(--color-foreground)]">Report submitted</p>
        <p className="text-[11px] text-[var(--color-muted)] max-w-xs">
          Your email client should have opened. If not, send directly to{" "}
          <a href="mailto:support@vendly.app" className="font-bold text-[var(--color-accent)] underline">
            support@vendly.app
          </a>
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-[11px] font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] underline mt-1"
        >
          Send another report
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Topic */}
      <div className="relative">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className={[
            "w-full h-12 px-4 rounded-2xl border border-[var(--color-border)] appearance-none",
            "bg-[var(--color-background)] text-base text-[var(--color-foreground)]",
            "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
            "transition-all",
            !topic ? "text-[var(--color-muted)]" : "",
          ].join(" ")}
        >
          <option value="" disabled>Select a topic…</option>
          {REPORT_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
      </div>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue in detail. The more context you provide, the faster we can help…"
        rows={4}
        maxLength={1000}
        required
        className={[
          "w-full px-4 py-3 rounded-2xl border border-[var(--color-border)]",
          "bg-[var(--color-background)] text-[var(--color-foreground)] text-base",
          "placeholder:text-[var(--color-muted)]/50 resize-none",
          "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
          "transition-all",
        ].join(" ")}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-muted)] tabular-nums">{message.length}/1000</span>
        <Button
          type="submit"
          disabled={status === "sending" || !topic || message.trim().length < 10}
          className="h-11 px-6 rounded-2xl text-xs font-black uppercase tracking-widest"
        >
          {status === "sending" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" /> Submit
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest">{title}</p>
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
    <div className="max-w-lg mx-auto space-y-5 pb-10">
      {/* ── Back ── */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Settings
      </Link>

      <div>
        <h1 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">Help & Support</h1>
        <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">
          Find answers, contact us, or report a problem
        </p>
      </div>

      {/* ── Contact methods ── */}
      <Section title="Contact Us" icon={MessageCircle} iconBg="bg-emerald-500/10" iconColor="text-emerald-500">
        <div className="divide-y divide-[var(--color-border)]/50">
          {CONTACT_OPTIONS.map((opt) => (
            <a
              key={opt.id}
              href={opt.href}
              target={opt.id !== "phone" ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[var(--color-background)] active:bg-[var(--color-border)]/20 transition-colors"
            >
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${opt.bg}`}>
                <opt.icon className={`w-4 h-4 ${opt.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-foreground)]">{opt.label}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{opt.desc}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--color-muted)] -rotate-90 flex-shrink-0" />
            </a>
          ))}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section title="Frequently Asked Questions" icon={HelpCircle} iconBg="bg-blue-500/10" iconColor="text-blue-500">
        {FAQS.map((item, i) => (
          <FaqAccordion key={i} item={item} />
        ))}
      </Section>

      {/* ── Report a problem ── */}
      <Section title="Report a Problem" icon={Bug} iconBg="bg-rose-500/10" iconColor="text-rose-500">
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Something not working? Let us know and we'll get on it as soon as possible. Reports are reviewed within 2 business days.
          </p>
          <ReportForm />
        </div>
      </Section>

      {/* ── App version footer ── */}
      <p className="text-center text-[10px] text-[var(--color-muted)]">
        Vendly v1.0 · support@vendly.app
      </p>
    </div>
  );
}
