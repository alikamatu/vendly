'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Truck,
  Percent,
  Lock,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Building,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

interface TermSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  subsections: {
    heading: string;
    details: string;
    bulletPoints?: string[];
  }[];
}

const SELLER_TERMS: TermSection[] = [
  {
    id: 'merchant-kyc',
    title: 'Merchant Eligibility, Business KYC & Identity Verification',
    icon: Building,
    badge: 'Identity Standards',
    summary:
      'All sellers on Verndly must undergo identity vetting and maintain legitimate business standing before publishing product listings.',
    subsections: [
      {
        heading: '1.1 Eligibility & Legal Capacity',
        details:
          'To register and operate as a seller on Verndly, you must be at least eighteen (18) years of age, legally capable of entering into binding commercial contracts, and resident or incorporated within the Republic of Ghana or an authorized operating territory. Accounts registered by corporate entities, sole proprietors, or partnerships must be created by an authorized representative with full legal authority to bind the entity.',
      },
      {
        heading: '1.2 Mandatory KYC Documentation',
        details:
          'In compliance with anti-money laundering (AML) protocols and marketplace security regulations, Verndly reserves the right to require any of the following documents before or during merchant onboarding:',
        bulletPoints: [
          'Valid Government-Issued Photo ID (Ghana Card / National ID or International Passport).',
          'Tax Identification Number (TIN) or Ghana Revenue Authority (GRA) registration details where applicable.',
          "Registrar General's Department (RGD) or Office of the Registrar of Companies (ORC) Business Registration Certificate for corporate accounts.",
          'Verifiable physical business location address and active operating contact details.',
          'Direct settlement Mobile Money wallet or Ghanaian commercial bank account registered in the identical legal or business name.',
        ],
      },
      {
        heading: '1.3 Account Security & Store Representation',
        details:
          'You are solely responsible for maintaining the confidentiality of your login credentials and two-factor authentication factors. You may not sell, lease, transfer, or assign your Verndly merchant account or store identity to any third party without express prior written consent from Verndly. Misleading storefront branding that mimics or infringes upon established national or international brands will result in immediate shop suspension.',
      },
    ],
  },
  {
    id: 'catalog-integrity',
    title: 'Catalog Accuracy, Pricing Transparency & Anti-Counterfeiting',
    icon: ShieldAlert,
    badge: 'Listing Integrity',
    summary:
      'Merchants must list only authentic, accurately described products with transparent, all-inclusive pricing in Ghana Cedis.',
    subsections: [
      {
        heading: '2.1 Strict Prohibition of Counterfeits & Replicas',
        details:
          'Verndly maintains zero tolerance for counterfeit, knock-off, replica, unauthorized duplicate, pirated, or stolen goods. By listing a product, you explicitly warrant and represent that the merchandise is genuine, manufactured by the indicated brand, and lawfully obtained with clear title. Sellers who list or dispatch counterfeit items will face immediate, permanent platform expulsion, escrow account freezes, and referral to law enforcement authorities.',
      },
      {
        heading: '2.2 Accurate Product Representations & Disclosures',
        details: 'Product listings must represent the exact item delivered. You must disclose:',
        bulletPoints: [
          'True Physical Condition: Explicitly select Brand New, Open Box, Certified Refurbished, or Pre-Owned / Used.',
          'Genuine High-Resolution Imagery: Listing images must accurately showcase the actual item, including any cosmetic wear, blemishes, or included accessories.',
          'Precise Specifications: Model numbers, storage capacities, technical dimensions, materials, color shades, and expiry dates must be 100% accurate.',
          'Real-Time Stock Quantities: You must maintain accurate inventory levels to prevent order cancellations resulting from out-of-stock listings.',
        ],
      },
      {
        heading: '2.3 All-Inclusive Transparent Pricing',
        details:
          "All prices listed on Verndly must be denominated in Ghana Cedis (GH₵) and reflect the complete retail price. Sellers may not add arbitrary doorstep markups, unannounced handling surcharges, or hidden fees upon dispatch. Artificial price inflation paired with fake discount percentages ('strike-through deceit') is strictly prohibited.",
      },
    ],
  },
  {
    id: 'order-fulfillment',
    title: 'Order Fulfillment SLAs, Packaging & Dispatch Obligations',
    icon: Truck,
    badge: 'Fulfillment SLAs',
    summary:
      'Timely dispatch and protective packaging are mandatory requirements for maintaining active merchant status on Verndly.',
    subsections: [
      {
        heading: '3.1 Dispatch Turnaround Windows',
        details:
          'Prompt order processing is critical to marketplace reliability. Merchants must abide by the following dispatch Service Level Agreements (SLAs):',
        bulletPoints: [
          'Express / Same-Day Orders: Must be packaged and handed over to the courier service within twelve (12) hours of payment confirmation.',
          'Standard Orders: Must be packaged and dispatched within twenty-four (24) to forty-eight (48) hours maximum.',
          'Customer Notification: The tracking reference, courier contact, or dispatch status must be updated immediately in your seller dashboard upon handover.',
        ],
      },
      {
        heading: '3.2 Protective Transit Packaging Standards',
        details:
          'Merchants are strictly responsible for packaging items in a manner that ensures safe, undamaged arrival. Fragile items (glassware, electronics, ceramics, liquids) must be wrapped in bubble wrap, tamper-evident seals, and sturdy outer boxes. Damage incurred during transit due to negligent, flimsy, or insufficient merchant packaging is the sole financial responsibility of the seller.',
      },
      {
        heading: '3.3 Late Dispatch & Order Cancellation Penalties',
        details:
          "If a merchant fails to dispatch an order within forty-eight (48) hours of placement without prior written agreement from the buyer, Verndly reserves the right to automatically cancel the transaction, issue an immediate full escrow refund to the buyer, and record a Late Shipment defect against the merchant's store score.",
      },
    ],
  },
  {
    id: 'commission-escrow',
    title: '4% Platform Fee, Escrow Holding & Payout Settlement',
    icon: Percent,
    badge: 'Transparent 4% Fee',
    summary:
      'Verndly charges a simple 4% platform commission on completed orders, protecting funds via escrow until delivery is verified.',
    subsections: [
      {
        heading: '4.1 Flat 4% Platform Commission Structure',
        details:
          'Verndly operates on an honest, transparent revenue model. There are zero upfront listing fees, zero store setup charges, and zero monthly shop rent. Verndly deducts a flat four percent (4%) marketplace facilitation fee from the gross merchandise sales value only when an order is successfully completed and confirmed.',
      },
      {
        heading: '4.2 Escrow Protection Framework',
        details:
          'To safeguard both parties against fraud, all buyer payments processed through Paystack are held in secure escrow settlement accounts. Funds are never released to the seller prior to shipment. This ensures buyers shop with confidence, driving higher conversion rates and sales volume for merchants.',
      },
      {
        heading: '4.3 Automated Payout Release Schedule',
        details: 'Payout balances become available for settlement under the following conditions:',
        bulletPoints: [
          'Buyer Acceptance: Immediate payout clearance once the customer confirms successful delivery and satisfactory inspection in their account.',
          'Statutory 3-Day Window: In the absence of early confirmation, funds automatically mature and release to the seller three (3) calendar days following verified courier delivery, provided no return claim is lodged.',
          'Settlement Channels: Automated daily transfers to your linked MTN Mobile Money, Telecel Cash, AT Cash wallet, or Ghanaian Commercial Bank account.',
          'Zero Hidden Withdrawal Surcharges: Verndly charges no extra fee for automated payout disbursements beyond standard telecommunication network transfer fees.',
        ],
      },
    ],
  },
  {
    id: 'anti-circumvention',
    title: 'Customer Communications & Anti-Circumvention Policy',
    icon: MessageSquare,
    badge: 'Platform Integrity',
    summary:
      'All buyer interactions must remain on-platform. Directing customers off Verndly to avoid escrow fees is strictly prohibited.',
    subsections: [
      {
        heading: '5.1 Absolute Prohibition of Off-Platform Solicitation',
        details:
          'To protect our marketplace ecosystem, sellers are strictly prohibited from attempting to circumvent Verndly checkout. This includes, without limitation:',
        bulletPoints: [
          'Asking buyers to send direct Mobile Money payments or bank transfers outside of Verndly checkout.',
          'Offering cash-on-delivery (COD) arrangements designed to bypass platform escrow and dispute protection.',
          'Including external payment links, bank account numbers, or direct personal MoMo numbers in product listings or chat messages.',
          'Diverting Verndly leads or customers to complete transactions on personal websites, external social media accounts, or private messaging channels.',
        ],
      },
      {
        heading: '5.2 Sanctions for Circumvention',
        details:
          'Any merchant identified soliciting off-platform transactions faces immediate, permanent account termination, forfeiture of pending promotional credits, and potential legal action for intentional breach of contract and platform fraud.',
      },
      {
        heading: '5.3 Respectful Professional Communication & Privacy',
        details:
          'Merchants must maintain a courteous, professional tone in all customer correspondence. In accordance with the Ghana Data Protection Act, 2012 (Act 843), customer contact information (names, delivery addresses, phone numbers) provided to you may solely be utilized for the direct fulfillment of the specific order. You may not harvest, store, or utilize customer contact info for unsolicited marketing, newsletters, or third-party disclosures.',
      },
    ],
  },
  {
    id: 'returns-replacements',
    title: '3-Day Buyer Protection & Merchant Return Obligations',
    icon: RefreshCw,
    badge: 'Buyer Protection',
    summary:
      'Sellers must honor the 3-day return guarantee for items delivered damaged, defective, or materially mismatched.',
    subsections: [
      {
        heading: '6.1 Honoring the 3-Day Guarantee',
        details:
          'All merchants on Verndly are contractually bound to honor our statutory 3-Day Buyer Protection policy. If a buyer files a legitimate return claim within three (3) calendar days of verified delivery due to transit damage, technical defect (DOA), or listing mismatch, the merchant must accept the return or provide an identical, working replacement at no additional cost.',
      },
      {
        heading: '6.2 Return Shipping Logistics Costs',
        details:
          "When a return is triggered by merchant fault (defective merchandise, transit damage due to poor packaging, or incorrect item sent), the merchant is 100% financially liable for the return courier shipping costs. Verndly will deduct verified return transit costs from the merchant's pending balance if the seller fails to arrange courier pickup.",
      },
      {
        heading: '6.3 Return Inspection & Escrow Mediation SLA',
        details:
          "Upon physical return of the item, the merchant has forty-eight (48) hours to inspect the package. If the item is returned in its original received state, the merchant must confirm receipt to trigger the buyer's refund. Unjustified or frivolous rejections of legitimate returns will be arbitrated by Verndly Trust & Safety, whose determination shall be final and binding.",
      },
    ],
  },
  {
    id: 'prohibited-goods',
    title: 'Prohibited Goods & Restricted Merchandise Standards',
    icon: AlertTriangle,
    badge: 'Prohibited Categories',
    summary:
      'Listing illegal, hazardous, unapproved, or infringing merchandise results in immediate takedown and account termination.',
    subsections: [
      {
        heading: '7.1 Banned Categories & Unlawful Items',
        details:
          'Merchants may not list, advertise, or sell any of the following items on Verndly:',
        bulletPoints: [
          'Illegal narcotics, prescription pharmaceuticals, controlled substances, and unapproved herbal concoctions.',
          'Firearms, explosive materials, ammunition, hunting weapons, tactical switchblades, and pepper spray.',
          'Adult entertainment, sexually explicit materials, pornography, or non-consensual imagery.',
          'Counterfeit luxury apparel, replica watches, bootleg electronics, and unauthorized software keys.',
          'Stolen property, unlocked or blacklisted cellular devices, and items obtained through unlawful means.',
          'Hazardous chemicals, flammable liquids, expired food products, and unapproved medical devices.',
        ],
      },
      {
        heading: '7.2 Regulatory Reporting & Product Seizures',
        details:
          'Verndly cooperates fully with Ghanaian regulatory bodies, including the Food and Drugs Authority (FDA), the Ghana Standards Authority (GSA), the Data Protection Commission (DPC), and the Criminal Investigation Department (CID) of the Ghana Police Service. Unlawful listings will be reported immediately without prior notice.',
      },
    ],
  },
  {
    id: 'reviews-reputation',
    title: 'Authentic Reviews, Ratings & Marketplace Integrity',
    icon: CheckCircle2,
    badge: 'Review Integrity',
    summary:
      'Customer reviews must reflect honest consumer experiences. Review manipulation or intimidation is strictly prohibited.',
    subsections: [
      {
        heading: '8.1 Zero Review Manipulation Policy',
        details:
          'Reviews and star ratings are the foundation of buyer trust. Sellers are strictly prohibited from attempting to manipulate reviews. Prohibited conduct includes:',
        bulletPoints: [
          "Purchasing products from your own storefront ('brushing') using alternate accounts to fabricate positive reviews.",
          'Paying, offering gifts, rebates, or future discounts in exchange for positive reviews.',
          'Coercing, threatening, or harassing customers to alter or delete honest negative ratings.',
          'Submitting defamatory, misleading, or abusive reviews against competitor stores.',
        ],
      },
      {
        heading: '8.2 Review Dispute Escalation',
        details:
          'If you believe a review violates our community guidelines (e.g., contains hate speech, profanity, or refers to a different transaction), you may flag it for moderation by emailing support@verndly.com with the order reference and evidence.',
      },
    ],
  },
  {
    id: 'account-health',
    title: 'Performance Benchmarks, Rolling Reserves & Termination',
    icon: Scale,
    badge: 'Store Performance',
    summary:
      'Merchants must maintain acceptable order defect rates and fulfillment metrics to retain active store privileges.',
    subsections: [
      {
        heading: '9.1 Core Seller Health Metrics',
        details:
          'To guarantee high customer satisfaction, Verndly monitors seller performance against the following operational thresholds:',
        bulletPoints: [
          'Order Defect Rate (ODR): Must remain below 2.0% of total fulfilled orders over any thirty-day evaluation period.',
          'Late Shipment Rate (LSR): Must remain below 5.0% of total processed orders.',
          'Pre-Fulfillment Cancellation Rate: Must remain below 2.5% (canceling orders due to out-of-stock inventory).',
        ],
      },
      {
        heading: '9.2 Temporary Rolling Reserves',
        details:
          "In events where a merchant's account experiences abnormal order spikes, elevated dispute volumes, chargebacks, or suspected fraudulent activity, Verndly reserves the right to implement a temporary rolling reserve (holding up to 20% of sales for 14 calendar days) to guarantee buyer refund coverage.",
      },
      {
        heading: '9.3 Termination & Account Closure',
        details:
          'Merchants may close their shop at any time, provided all pending orders have been delivered and the 3-day return inspection window has elapsed. Verndly reserves the right to immediately suspend or permanently terminate merchant privileges for material breach of these terms, fraud, counterfeiting, or chronic non-fulfillment.',
      },
    ],
  },
  {
    id: 'legal-tax',
    title: 'Tax Responsibilities, Indemnification & Governing Law',
    icon: Lock,
    badge: 'Legal Governance',
    summary:
      'Merchants are solely responsible for statutory taxes. This agreement is governed by the laws of the Republic of Ghana.',
    subsections: [
      {
        heading: '10.1 Independent Merchant Tax Responsibility',
        details:
          'Merchants operate as independent commercial enterprises, not employees, agents, or joint-venture partners of Verndly. You are solely responsible for determining, collecting, reporting, and remitting all applicable local, regional, and national taxes, including Value Added Tax (VAT), National Health Insurance Levy (NHIL), GETFund Levy, and corporate or personal income taxes in accordance with the Ghana Revenue Authority (GRA).',
      },
      {
        heading: '10.2 Merchant Indemnification',
        details:
          'You agree to defend, indemnify, and hold harmless Verndly Technologies, its directors, officers, employees, and agents against any claims, liabilities, damages, fines, penalties, and legal costs arising from: (a) your breach of these Merchant Terms; (b) product liability claims or transit injuries caused by your merchandise; or (c) infringement of third-party intellectual property or privacy rights.',
      },
      {
        heading: '10.3 Governing Law & Jurisdiction',
        details:
          'This Agreement and any dispute or claim arising out of or in connection with it shall be governed by and construed in accordance with the laws of the Republic of Ghana. The Commercial Courts of Accra shall possess exclusive jurisdiction to resolve any dispute arising under this Agreement.',
      },
    ],
  },
];

export default function SellerTermsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const filteredSections =
    activeTab === 'all' ? SELLER_TERMS : SELLER_TERMS.filter((s) => s.id === activeTab);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* ── Navigation Breadcrumb ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/settings"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 text-xs font-normal transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Settings
        </Link>
        <span className="text-muted-foreground bg-surface border-border/70 rounded-full border px-2.5 py-1 font-mono text-[11px]">
          Version 2.4 · Effective Sept 2026
        </span>
      </div>

      {/* ── Hero Header ── */}
      <div className="bg-surface border-border/80 space-y-4 rounded-3xl border p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Merchant Master Agreement
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            <DollarSign className="text-primary h-3.5 w-3.5" />
            <span>Flat 4% Commission · Escrow Protected</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
            Verndly Seller Agreement &amp; Merchant Code of Conduct
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
            This Agreement governs your legal relationship as an independent merchant on the Verndly
            marketplace. Verndly acts as a technology platform facilitator, payment escrow
            settlement intermediary, and marketplace infrastructure provider. By listing goods or
            operating a storefront on Verndly, you legally agree to adhere to these terms.
          </p>
        </div>

        {/* Quick Policies Bar */}
        <div className="border-border/60 flex flex-wrap items-center gap-2 border-t pt-4 text-xs">
          <span className="text-muted-foreground mr-1 font-medium">Public Legal Policies:</span>
          <Link
            href="/terms"
            target="_blank"
            className="bg-surface border-border/70 text-foreground hover:border-primary/50 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors"
          >
            <span>Terms of Service</span>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            className="bg-surface border-border/70 text-foreground hover:border-primary/50 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors"
          >
            <span>Privacy Notice</span>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </Link>
          <Link
            href="/returns"
            target="_blank"
            className="bg-surface border-border/70 text-foreground hover:border-primary/50 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors"
          >
            <span>3-Day Buyer Returns</span>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </Link>
          <Link
            href="/shipping"
            target="_blank"
            className="bg-surface border-border/70 text-foreground hover:border-primary/50 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-colors"
          >
            <span>Shipping Policy</span>
            <ExternalLink className="text-muted-foreground h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Quick Jump Navigation Filter ── */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground px-1 text-xs font-semibold uppercase tracking-wider">
          Select Agreement Section
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border-border/70 text-muted-foreground hover:text-foreground border'
            }`}
          >
            All Sections (10)
          </button>
          {SELLER_TERMS.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveTab(sec.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === sec.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface border-border/70 text-muted-foreground hover:text-foreground border'
              }`}
            >
              {idx + 1}. {sec.badge}
            </button>
          ))}
        </div>
      </div>

      {/* ── Key Highlights Callout ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-surface border-border/70 space-y-1.5 rounded-2xl border p-4">
          <div className="text-foreground flex items-center gap-2 text-xs font-medium">
            <Percent className="text-primary h-4 w-4" />
            <span>Flat 4% Marketplace Fee</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Zero setup fee, zero monthly rent. We only take 4% on completed sales after the buyer
            receives their order.
          </p>
        </div>

        <div className="bg-surface border-border/70 space-y-1.5 rounded-2xl border p-4">
          <div className="text-foreground flex items-center gap-2 text-xs font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Escrow Settlement</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Funds held securely via Paystack. Automated payouts to Mobile Money (MTN, Telecel, AT)
            or Ghanaian bank accounts.
          </p>
        </div>

        <div className="bg-surface border-border/70 space-y-1.5 rounded-2xl border p-4">
          <div className="text-foreground flex items-center gap-2 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Anti-Circumvention Rule</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Soliciting payments outside Verndly or off-platform direct MoMo transfers leads to
            immediate permanent shop bans.
          </p>
        </div>
      </div>

      {/* ── Section Cards ── */}
      <div className="space-y-6">
        {filteredSections.map((sec, idx) => {
          const Icon = sec.icon;
          const isExpanded = expandedSection === sec.id;
          const displayIdx =
            activeTab === 'all' ? idx + 1 : SELLER_TERMS.findIndex((s) => s.id === sec.id) + 1;

          return (
            <Card
              key={sec.id}
              className="bg-surface border-border/80 space-y-6 rounded-3xl border p-6 sm:p-8"
              hoverEffect={false}
              shadowless={true}
            >
              {/* Section Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-primary/10 text-primary inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-xs font-bold">
                      {displayIdx}
                    </span>
                    <span className="text-primary bg-primary/10 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider">
                      {sec.badge}
                    </span>
                  </div>
                  <h2 className="text-foreground flex items-center gap-2.5 text-lg font-medium sm:text-xl">
                    <Icon className="text-primary h-5 w-5 shrink-0" />
                    <span>{sec.title}</span>
                  </h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">{sec.summary}</p>
                </div>
              </div>

              {/* Subsections */}
              <div className="border-border/60 space-y-5 border-t pt-4">
                {sec.subsections.map((sub, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">
                      {sub.heading}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{sub.details}</p>
                    {sub.bulletPoints && sub.bulletPoints.length > 0 && (
                      <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 pt-1 text-xs">
                        {sub.bulletPoints.map((bp, bpIdx) => (
                          <li key={bpIdx} className="leading-relaxed">
                            {bp}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Merchant Support & Escalation Footer ── */}
      <Card
        className="bg-surface border-border/80 space-y-6 rounded-3xl border p-6 sm:p-8"
        hoverEffect={false}
        shadowless={true}
      >
        <div className="space-y-2">
          <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
            <Scale className="text-primary h-4 w-4" />
            Merchant Support &amp; Arbitration Inquiries
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            For operational inquiries, account verification appeals, or dispute escalations under
            this Agreement, please reach out directly to our dedicated seller legal and compliance
            teams.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
          <div className="bg-surface border-border/60 space-y-1 rounded-2xl border p-3.5">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              Merchant Operations
            </p>
            <a
              href="mailto:support@verndly.com"
              className="text-primary block text-xs font-medium hover:underline"
            >
              support@verndly.com
            </a>
            <p className="text-muted-foreground text-[10px]">SLA inquiries &amp; onboarding</p>
          </div>

          <div className="bg-surface border-border/60 space-y-1 rounded-2xl border p-3.5">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              Escrow &amp; Dispute Mediation
            </p>
            <a
              href="mailto:support@verndly.com"
              className="text-primary block text-xs font-medium hover:underline"
            >
              support@verndly.com
            </a>
            <p className="text-muted-foreground text-[10px]">Returns &amp; payout holds</p>
          </div>

          <div className="bg-surface border-border/60 space-y-1 rounded-2xl border p-3.5">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              Legal &amp; Compliance
            </p>
            <a
              href="mailto:legal@verndly.com"
              className="text-primary block text-xs font-medium hover:underline"
            >
              legal@verndly.com
            </a>
            <p className="text-muted-foreground text-[10px]">Regulatory &amp; IP takedowns</p>
          </div>
        </div>

        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-[11px]">
            © {new Date().getFullYear()} Verndly Technologies Inc. All rights reserved. Registered
            under the Companies Act, 2019 (Act 992) of Ghana.
          </p>
          <Link
            href="/terms"
            className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            View Public Conditions of Use
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
