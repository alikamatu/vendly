"use client";

import { ArrowLeft, FileText, ShieldAlert, CheckCircle2, Users, CreditCard, Lock, Scale } from "lucide-react";
import Link from "next/link";

const SECTIONS = [
  {
    icon: Users,
    title: "Who Can Use Verndly",
    body: "Verndly is open to anyone who creates an account with a valid email address. Sellers must additionally complete identity verification before listing products. You must be at least 16 years old to register.",
  },
  {
    icon: CheckCircle2,
    title: "Seller Conduct",
    body: "Sellers agree to provide accurate product descriptions, fulfil orders within the agreed timeframe, and communicate honestly with buyers. Misrepresentation of goods, price manipulation, or order abandonment may result in account suspension.",
  },
  {
    icon: ShieldAlert,
    title: "Prohibited Items",
    body: "You may not list illegal substances, weapons, counterfeit goods, stolen items, or anything that violates intellectual property rights. Verndly may remove any listing and suspend accounts without notice for violations of this policy.",
  },
  {
    icon: CreditCard,
    title: "Payments & Fees",
    body: "Buyers pay sellers directly through the platform's supported payment methods. A platform fee may apply to transactions. Payouts to sellers are processed after delivery confirmation. Detailed fee structures are in the Seller Agreement.",
  },
  {
    icon: Lock,
    title: "Privacy & Data",
    body: "We collect only the data needed to run the platform — your name, email, and transaction history. We encrypt data in transit (TLS) and at rest. We never sell your personal data to third parties. You may request deletion of your account at any time.",
  },
  {
    icon: Scale,
    title: "Dispute Resolution",
    body: "If a dispute arises between a buyer and seller, contact us at support@verndly.com. We act as mediators but are not liable for individual transaction outcomes. We reserve the right to make final decisions on disputes brought to our attention.",
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Terms & Conditions</h1>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">User agreement and platform policies</p>
      </div>

      {/* Header card */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Verndly User Agreement</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Last updated: May 2026</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-2 leading-relaxed">
            By using Verndly you agree to these terms. Please read them carefully. If you do not agree, do not use the platform.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50 overflow-hidden">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="p-5 space-y-2">
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
                <h2 className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-foreground)]">
                  {s.title}
                </h2>
              </div>
              <p className="text-[12px] text-[var(--color-muted)] leading-relaxed">{s.body}</p>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4">
        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed italic">
          By continuing to use Verndly, you acknowledge that you have read and agree to these terms. Questions? Email us at{" "}
          <a href="mailto:support@verndly.com" className="font-normal text-[var(--color-accent)] not-italic hover:underline">
            support@verndly.com
          </a>
        </p>
      </div>
    </div>
  );
}
