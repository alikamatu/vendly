"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Users,
  CreditCard,
  Lock,
  Scale,
  Truck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  Info,
} from "lucide-react";
import Link from "next/link";

interface CustomerSection {
  id: string;
  icon: React.ElementType;
  badge: string;
  title: string;
  summary: string;
  clauses: {
    heading: string;
    text: string;
    points?: string[];
  }[];
}

const CUSTOMER_SECTIONS: CustomerSection[] = [
  {
    id: "eligibility",
    icon: Users,
    badge: "User Eligibility",
    title: "1. Eligibility, Account Creation & Security",
    summary:
      "Guidelines for creating and safeguarding your Verndly customer account.",
    clauses: [
      {
        heading: "Age & Legal Capacity",
        text: "You must be at least eighteen (18) years of age, or the age of legal majority in your jurisdiction, to create a Verndly account, bind yourself to orders, or initiate payment transactions. Minors may use the platform only under the direct supervision and authorization of a parent or legal guardian.",
      },
      {
        heading: "Account Credentials & Confidentiality",
        text: "You are solely responsible for maintaining the confidentiality of your account credentials, password, and session access. You agree to immediately notify Verndly Customer Support at support@verndly.app if you suspect any unauthorized access, session compromise, or fraudulent account activity.",
      },
      {
        heading: "Truthful Registration Information",
        text: "You warrant that all information provided during registration and checkout—including your legal name, billing details, active telephone number, and delivery address—is truthful, accurate, and kept up to date.",
      },
    ],
  },
  {
    id: "marketplace-model",
    icon: Scale,
    badge: "Platform Facilitator",
    title: "2. Marketplace Facilitator Model & Seller Contracts",
    summary:
      "Understanding how Verndly connects you with verified independent merchants.",
    clauses: [
      {
        heading: "Role of Verndly",
        text: "Verndly is a multi-vendor digital commerce marketplace operated by Verndly Technologies Inc. Verndly provides the technology infrastructure, catalog discovery, secure payment processing, and escrow settlement systems. Unless expressly labeled as 'Sold by Verndly', products listed on the platform are sold directly by independent third-party verified merchants.",
      },
      {
        heading: "Contract of Sale",
        text: "When you purchase an item from an independent seller on Verndly, the legal contract of sale is formed directly between you (the Buyer) and the merchant (the Seller). Verndly acts as an authorized commercial agent and escrow custodian to facilitate the order, hold settlement funds, and resolve delivery or return disputes.",
      },
    ],
  },
  {
    id: "pricing-payments",
    icon: CreditCard,
    badge: "Transparent Pricing",
    title: "3. Transparent Pricing, Payments & Escrow Protection",
    summary:
      "Zero hidden fees, all-inclusive pricing in Ghana Cedis, and secure escrow holding.",
    clauses: [
      {
        heading: "All-Inclusive Retail Pricing",
        text: "All product prices displayed on Verndly are denominated in Ghana Cedis (GH₵) and represent the total retail price. Applicable delivery fees are calculated and transparently displayed at checkout prior to payment authorization. There are zero surprise doorstep surcharges, hidden processing fees, or platform surcharges levied against buyers.",
      },
      {
        heading: "PCI-DSS Level 1 Secure Payments",
        text: "All digital payments are processed through Paystack, a certified PCI-DSS Level 1 payment gateway. We support all major Ghanaian payment methods:",
        points: [
          "MTN Mobile Money (MoMo)",
          "Telecel Cash",
          "AT Money",
          "Visa and Mastercard debit & credit cards",
        ],
      },
      {
        heading: "Escrow Holding Mechanism",
        text: "To protect your funds, payments made on Verndly are held in an escrow settlement account and are never disbursed to the seller upfront. The seller receives their payout only after your order is safely delivered and you have completed your 7-day inspection window without filing a return claim.",
      },
    ],
  },
  {
    id: "shipping-fulfillment",
    icon: Truck,
    badge: "Order Delivery",
    title: "4. Fulfillment, Dispatch & Delivery Turnaround",
    summary:
      "Nationwide shipping standards, digital address obligations, and delivery tracking.",
    clauses: [
      {
        heading: "Delivery Coverage & Dispatch",
        text: "Sellers on Verndly fulfill orders across all sixteen (16) regions of Ghana through verified courier partners and express delivery services. Dispatch timelines depend on the shipping tier selected at checkout (Same-Day Express, Next-Day Delivery, or Standard 2-3 Day Nationwide Delivery).",
      },
      {
        heading: "Recipient Accuracy & GPS Coordinates",
        text: "To guarantee successful delivery, you must provide an accurate recipient name, reachable telephone number, and complete delivery address (including Ghana Post GPS Digital Address or prominent landmarks). Verndly and its courier partners are not liable for delayed shipments caused by unreachable contact numbers or erroneous delivery addresses.",
      },
      {
        heading: "Delivery Confirmation & Handover",
        text: "Upon delivery, the courier will record a handover timestamp or request a delivery verification code (OTP). We encourage you to inspect the external packaging for tampering or damage before accepting the parcel.",
      },
    ],
  },
  {
    id: "returns-refunds",
    icon: RefreshCw,
    badge: "Buyer Protection",
    title: "5. 7-Day Buyer Protection Guarantee & Refunds",
    summary:
      "Our comprehensive return policy ensures prompt refunds or replacements for defective items.",
    clauses: [
      {
        heading: "The 7-Day Inspection Window",
        text: "Every purchase on Verndly is backed by our 7-Day Buyer Protection Guarantee. You have seven (7) calendar days from the date of verified parcel receipt to inspect your item and report any defects, transit damage, or listing discrepancies.",
      },
      {
        heading: "Valid Grounds for Return & Full Refund",
        text: "You are entitled to a 100% full refund or free replacement under the following conditions:",
        points: [
          "Non-Delivery: The parcel never arrives within the specified delivery timeframe.",
          "Damaged in Transit: The merchandise arrives broken, crushed, or physically compromised.",
          "Defective or Dead-on-Arrival (DOA): The electronic or mechanical product does not function as advertised.",
          "Listing Mismatch: The item received differs materially in brand, model, color, specifications, or condition from the product listing.",
        ],
      },
      {
        heading: "Free Return Shipping for Merchant Fault",
        text: "If a return is caused by defect, damage, or seller listing error, you do not pay for return shipping. The merchant covers 100% of return transit logistics.",
      },
      {
        heading: "Escrow Refund Timelines",
        text: "Once a return is verified, funds are automatically refunded back to your original payment method: Mobile Money wallets (MTN MoMo, Telecel Cash, AT) within 24 to 48 hours; Commercial Bank Cards within 3 to 7 business days.",
      },
    ],
  },
  {
    id: "privacy-governance",
    icon: Lock,
    badge: "Data Privacy",
    title: "6. Customer Privacy & Data Protection (Ghana Act 843)",
    summary:
      "How your personal information is protected under national and international privacy laws.",
    clauses: [
      {
        heading: "Data Protection Act Compliance",
        text: "Verndly complies strictly with the Data Protection Act, 2012 (Act 843) of Ghana and international data protection standards (GDPR). We collect only data necessary to fulfill orders, prevent transaction fraud, and enhance your shopping experience.",
      },
      {
        heading: "Zero Data Monetization",
        text: "Verndly never sells, rents, or trades your personal data, phone number, or purchase history to third-party data brokers or marketing agencies.",
      },
      {
        heading: "Data Security & Encryption",
        text: "All payment records and sensitive credentials are encrypted using industry-standard AES-256 and transmitted over TLS 1.3 encrypted connections. You have the right to request a complete copy of your personal data or permanently delete your account at any time via Account Settings > Privacy & Data.",
      },
    ],
  },
  {
    id: "dispute-resolution",
    icon: MessageSquare,
    badge: "Dispute Mediation",
    title: "7. Dispute Resolution & Customer Support",
    summary:
      "Impartial escrow arbitration and friendly, accessible support channels.",
    clauses: [
      {
        heading: "Escrow Arbitration",
        text: "In the event of a disagreement between you and a merchant regarding item condition, fulfillment delays, or return legitimacy, Verndly Trust & Safety acts as an impartial escrow mediator. Both parties may submit photographic evidence, communication logs, and courier waybills. Verndly's dispute determination is final and binding.",
      },
      {
        heading: "Support Escalation Channels",
        text: "Our customer support team is available Monday through Saturday to assist you:",
        points: [
          "Email Support: support@verndly.app",
          "Escrow & Dispute Desk: disputes@verndly.app",
          "Official WhatsApp Channel: +233 53 406 5652",
        ],
      },
    ],
  },
  {
    id: "governing-law",
    icon: ShieldAlert,
    badge: "Statutory Law",
    title: "8. Consumer Protection, Limitation of Liability & Law",
    summary:
      "Statutory rights under Ghana law and limitation of platform liability.",
    clauses: [
      {
        heading: "Non-Excludable Statutory Rights",
        text: "Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, statutory warranty, or right conferred upon you by the Electronic Transactions Act, 2008 (Act 772) or applicable Ghanaian consumer protection legislation.",
      },
      {
        heading: "Limitation of Platform Liability",
        text: "To the maximum extent permitted by law, Verndly's total liability to you for any claim arising from a transaction is strictly capped at the total amount paid by you for the specific order under dispute.",
      },
      {
        heading: "Governing Law & Jurisdiction",
        text: "These terms and conditions are governed by and construed in accordance with the laws of the Republic of Ghana. Any formal legal proceedings shall be subject to the exclusive jurisdiction of the Commercial Courts of Accra.",
      },
    ],
  },
];

export default function AccountTermsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* ── Top Navigation ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Account
        </Link>
        <span className="text-[10px] font-mono text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 rounded-full">
          Effective: September 2026
        </span>
      </div>

      {/* ── Header Card ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Customer Agreement &amp; Policies
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Verndly Terms &amp; Conditions
            </h1>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
          Welcome to Verndly. This User Agreement outlines your rights, protections, and responsibilities
          as a shopper on our multi-vendor commerce platform. Every transaction on Verndly is safeguarded by
          our 7-Day Buyer Protection Guarantee and secure escrow payment settlement.
        </p>

        {/* Quick Links to Public Policies */}
        <div className="pt-4 border-t border-[var(--color-border)]/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-[var(--color-muted)] mr-1">
            Complete Policy Documents:
          </span>
          <Link
            href="/terms"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-primary/50 transition-colors"
          >
            <span>Master Terms</span>
            <ExternalLink className="w-3 h-3 text-[var(--color-muted)]" />
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-primary/50 transition-colors"
          >
            <span>Privacy Policy</span>
            <ExternalLink className="w-3 h-3 text-[var(--color-muted)]" />
          </Link>
          <Link
            href="/returns"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-primary/50 transition-colors"
          >
            <span>7-Day Returns</span>
            <ExternalLink className="w-3 h-3 text-[var(--color-muted)]" />
          </Link>
          <Link
            href="/shipping"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-primary/50 transition-colors"
          >
            <span>Shipping Rates</span>
            <ExternalLink className="w-3 h-3 text-[var(--color-muted)]" />
          </Link>
        </div>
      </div>

      {/* ── Key Trust Assurances ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-foreground)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Escrow Protection</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Sellers are never paid until you receive and inspect your items.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-foreground)]">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>7-Day Full Returns</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Full 100% refund if your order is damaged, defective, or incorrect.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-foreground)]">
            <Lock className="w-4 h-4 text-primary" />
            <span>Ghana Act 843 Privacy</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Strict no-sale of personal data; end-to-end encrypted transactions.
          </p>
        </div>
      </div>

      {/* ── Detailed Clauses List ── */}
      <div className="space-y-4">
        {CUSTOMER_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedId === section.id;

          return (
            <div
              key={section.id}
              className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden transition-all duration-200"
            >
              {/* Header Bar */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full p-5 sm:p-6 flex items-start justify-between gap-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {section.badge}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span>{section.title}</span>
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    {section.summary}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[var(--color-muted)] shrink-0 mt-1">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-[var(--color-border)]/60 space-y-5">
                  {section.clauses.map((clause, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
                        {clause.heading}
                      </h3>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                        {clause.text}
                      </p>
                      {clause.points && clause.points.length > 0 && (
                        <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--color-muted)] pt-1">
                          {clause.points.map((pt, pIdx) => (
                            <li key={pIdx} className="leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer Contact & Escalation ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground)]">
              Questions or Concerns Regarding These Terms?
            </h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Our legal and customer support teams are dedicated to ensuring a transparent, secure, and fair
              marketplace experience. If you have questions about order fulfillment, buyer protection, or data privacy,
              please reach out:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-border)]/40 space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[var(--color-muted)]">Customer Care &amp; Disputes</p>
            <a href="mailto:support@verndly.app" className="text-xs font-medium text-primary hover:underline">
              support@verndly.app
            </a>
          </div>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-border)]/40 space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[var(--color-muted)]">Legal &amp; Privacy Compliance</p>
            <a href="mailto:legal@verndly.app" className="text-xs font-medium text-primary hover:underline">
              legal@verndly.app
            </a>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)]/60 text-center">
          <p className="text-[11px] text-[var(--color-muted)]">
            © {new Date().getFullYear()} Verndly Technologies Inc. All rights reserved. Accra, Republic of Ghana.
          </p>
        </div>
      </div>
    </div>
  );
}
