"use client";

import React, { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface QA {
  q: string;
  a: React.ReactNode;
  tags?: string[];
}

const QA_LIST: QA[] = [
  {
    q: "How do I create an account?",
    a: "Tap Sign up in the top-right, fill in your school details, and verify your email. You can shop right away.",
    tags: ["account"],
  },
  {
    q: "How do I become a seller?",
    a: (
      <>
        Visit{" "}
        <a className="text-primary underline" href="/seller-verification">
          Become a Seller
        </a>{" "}
        and upload your student verification document. Approvals usually take 24–48
        hours.
      </>
    ),
    tags: ["seller"],
  },
  {
    q: "What payment methods do you accept?",
    a: "Card, mobile money, and bank transfer via Paystack. Some sellers also accept cash on delivery.",
    tags: ["payment"],
  },
  {
    q: "How does Vendly Pro work?",
    a: (
      <>
        Pro membership is GH₵57/month, billed via Paystack. Pro sellers get featured
        placement, a downloadable storefront QR code, and advanced stock alerts. Manage
        your subscription from{" "}
        <a className="text-primary underline" href="/dashboard/settings">
          Dashboard → Settings
        </a>
        .
      </>
    ),
    tags: ["seller", "pro"],
  },
  {
    q: "How long does delivery take?",
    a: "Each seller publishes their dispatch window — typically same-day, next-day, or 2–3 days. See the seller's storefront for their exact policy.",
    tags: ["delivery"],
  },
  {
    q: "Can I return an item?",
    a: (
      <>
        Yes — see <a className="text-primary underline" href="/returns">Returns &amp; Refunds</a>. You have 7 days from delivery to request a return.
      </>
    ),
    tags: ["returns"],
  },
  {
    q: "Is my data safe?",
    a: (
      <>
        Yes. Payments are handled by Paystack — Vendly never sees your full card
        details. Read our{" "}
        <a className="text-primary underline" href="/privacy">privacy policy</a>.
      </>
    ),
    tags: ["privacy"],
  },
  {
    q: "How do I contact support?",
    a: (
      <>
        Email <a className="text-primary underline" href="mailto:hello@vendly.com">hello@vendly.com</a>, WhatsApp +233 24 000 0000, or use the{" "}
        <a className="text-primary underline" href="/contact">contact form</a>.
      </>
    ),
    tags: ["support"],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const filtered = QA_LIST.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.q.toLowerCase().includes(q) ||
      String(item.a).toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="FAQ" />
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 md:pb-32 space-y-8">
        <header className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            Help
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Frequently asked questions
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Quick answers to the questions we hear most. Can't find what you need?{" "}
            <a className="text-primary underline" href="/contact">Contact us</a>.
          </p>
        </header>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full h-11 pl-9 pr-3 rounded-2xl bg-surface border border-border text-[12px] font-bold outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-muted">
            No results for "{query}". Try different keywords or contact us.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FaqItem({ item }: { item: QA }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 md:px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-surface/50 transition-colors"
      >
        <span className="text-sm font-bold text-foreground">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-4 text-[13px] text-foreground/85 leading-relaxed">
          {item.a}
        </div>
      )}
    </li>
  );
}
