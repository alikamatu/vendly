import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import Link from "next/link";
import FaqJsonLd from "@/components/seo/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "7-Day Buyer Protection, Returns & Refunds Policy · Verndly",
  description:
    "Official 7-Day Buyer Protection policy, return eligibility, replacement protocols, escrow refund timelines, and dispute mediation on Verndly Ghana.",
  alternates: { canonical: `${SITE_URL}/returns` },
};

const RETURNS_FAQ = [
  {
    question: "How long is the return window on Verndly?",
    answer: "Buyers have seven (7) calendar days starting from the recorded delivery confirmation timestamp to inspect their purchase and file a return claim.",
  },
  {
    question: "How does the escrow protection work during returns?",
    answer: "Funds paid online via Paystack are held in secure escrow settlement accounts and are not disbursed to the seller until the 7-day buyer protection window passes without dispute.",
  },
  {
    question: "How quickly are approved refunds processed?",
    answer: "Approved refunds are executed directly via Paystack gateway reversal to the original Mobile Money or card account within 24–48 hours of merchant inspection.",
  },
  {
    question: "What happens if a seller rejects my return claim?",
    answer: "Buyers can escalate rejected claims directly to Verndly Trust & Safety Support for independent administrative arbitration and binding dispute resolution.",
  },
];

export default function ReturnsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Returns Policy", path: "/returns" },
        ]}
      />
      <FaqJsonLd items={RETURNS_FAQ} />
      <LegalPage
        eyebrow="Buyer Protection & Peace of Mind"
        title="Returns, Replacements & Refunds Policy"
        description="Every purchase on Verndly is backed by our escrow-protected 7-Day Buyer Protection Guarantee. If your order arrives damaged, defective, or materially different from the seller's listing, this policy ensures a prompt, fair replacement or full refund."
        updatedAt="September 2026"
        sections={[
          {
            title: "Verndly 7-Day Buyer Protection Guarantee",
            badge: "Escrow Assurance",
            body: (
              <>
                <p>
                  When you shop on Verndly, you are protected by our multi-layered Buyer Protection framework. Payments made
                online via Paystack are held in secure escrow settlement accounts and are not disbursed to the merchant until
                the item is delivered and you have had a full opportunity to inspect your purchase.
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed">
                <strong>The Verndly Guarantee:</strong> You are entitled to a full 100% refund or free replacement if: (a) your order
                never arrives; (b) the item arrives broken or damaged in transit; (c) the item has manufacturing defects or does not
                function as described; or (d) the merchandise delivered is materially different in model, brand, color, or condition
                from the seller&apos;s product listing.
              </div>
            </>
          ),
        },
        {
          title: "Inspection Window & Return Eligibility Standards",
          badge: "7-Day Window",
          body: (
            <>
              <p>
                The return inspection window spans <strong>seven (7) calendar days</strong>, commencing immediately upon the
                verified delivery timestamp recorded by our courier partner or your delivery confirmation notice.
              </p>
              <p>
                To qualify for a valid return and refund, items must satisfy the following physical condition standards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>The item must be in its original condition, with no customer-inflicted scratches, stains, tears, or signs of wear.</li>
                <li>All original packaging, manufacturer boxes, anti-tamper seals, warranty cards, manuals, and accessories must be returned intact.</li>
                <li>For consumer electronics and smart devices, all personal accounts (Google, Apple ID, Samsung accounts) must be completely unlinked and factory reset prior to return handover.</li>
                <li>Garments, footwear, and fashion accessories must have all original brand tags, labels, and hygiene liners intact and unremoved.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Valid Grounds for Return & Replacement",
          badge: "Eligible Claims",
          body: (
            <>
              <p>
                Return and refund claims are approved under the following verified circumstances:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm pt-1">
                <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                  <strong className="text-foreground">1. Damaged in Transit</strong>
                  <p className="text-muted-foreground">The package arrived cracked, broken, crushed, or visibly damaged during courier transit.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                  <strong className="text-foreground">2. Defective / Non-Functional</strong>
                  <p className="text-muted-foreground">The item does not power on, fails to perform advertised functions, or possesses hardware flaws.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                  <strong className="text-foreground">3. Materially Different Listing</strong>
                  <p className="text-muted-foreground">The delivered item differs significantly in brand, model, size, color, condition, or specifications.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                  <strong className="text-foreground">4. Incomplete or Missing Parts</strong>
                  <p className="text-muted-foreground">The package was missing essential cables, bundled accessories, or key parts advertised in the listing.</p>
                </div>
              </div>
            </>
          ),
        },
        {
          title: "Non-Returnable & Restricted Categories",
          badge: "Policy Exclusions",
          body: (
            <>
              <p>
                In accordance with statutory health, safety, and consumer hygiene regulations, the following categories are
                strictly non-returnable and non-refundable, unless received in a damaged or defective state upon initial delivery:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Personal Hygiene &amp; Intimate Goods:</strong> Underwear, lingerie, swimwear, earrings, hair accessories, cosmetics, skincare formulations, and perfumes once the protective hygiene seal has been broken or unsealed.
                </li>
                <li>
                  <strong>Perishable Consumer Goods:</strong> Fresh food items, beverages, perishable grocery goods, and fresh flowers with short shelf lives.
                </li>
                <li>
                  <strong>Custom &amp; Personalized Items:</strong> Products made to custom specifications, engraved jewelry, customized apparel, or tailor-made merchandise that cannot be resold.
                </li>
                <li>
                  <strong>Digital &amp; Virtual Products:</strong> Delivered software serial keys, gift cards, digital vouchers, or prepaid download codes.
                </li>
                <li>
                  <strong>Customer-Damaged Items:</strong> Goods damaged through customer misuse, liquid exposure, unauthorized electrical surges, physical drops, or unapproved repair attempts.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Step-by-Step Return Request Workflow",
          badge: "Return Process",
          body: (
            <>
              <p>
                Initiating a return on Verndly is fully digitalized and tracked directly through your account:
              </p>
              <ol className="list-decimal pl-5 space-y-2.5 text-xs md:text-sm">
                <li>
                  <strong>Locate Your Order:</strong> Sign in and navigate to <Link href="/orders" className="text-primary underline">My Orders</Link>. Select the order containing the item you wish to return.
                </li>
                <li>
                  <strong>Initiate Request:</strong> Click the <strong>&quot;Request Return&quot;</strong> button. Select the appropriate return reason from the dropdown menu (e.g. Defective, Damaged in Transit, Incorrect Item).
                </li>
                <li>
                  <strong>Upload Verification Evidence:</strong> Provide a clear written description of the issue alongside at least two (2) clear photographs or a short video demonstrating the defect, transit damage, or serial number. Clear photographic proof accelerates approval.
                </li>
                <li>
                  <strong>Seller Review Window (48 Hours):</strong> The merchant is notified immediately and has forty-eight (48) hours to review your evidence and approve the return or offer a free replacement.
                </li>
                <li>
                  <strong>Courier Handover:</strong> Upon return authorization, a return waybill is issued. Hand over the securely packaged item to our designated courier or return it to the merchant&apos;s authorized collection point.
                </li>
              </ol>
            </>
          ),
        },
        {
          title: "Return Shipping Logistics & Cost Responsibility",
          badge: "Logistics & Fees",
          body: (
            <>
              <p>
                Financial responsibility for return shipping costs is governed by fault:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Seller-Covered Return Courier (100% Free for Buyer):</strong> When a return is initiated due to merchant error, defective merchandise, transit damage, or an incorrect item dispatched, the seller is legally responsible for 100% of the return courier fees. Verndly covers or coordinates courier pickup at zero cost to the buyer.
                </li>
                <li>
                  <strong>Buyer-Covered Return Courier:</strong> If an individual merchant voluntarily agrees to accept a return or size exchange due to buyer change of mind (where the original item was delivered fully intact and accurately described), the buyer covers the return courier transportation fee.
                </li>
                <li>
                  <strong>Packaging Obligations:</strong> Buyers must package returned goods with adequate padding and protective cardboard. If an item is returned damaged due to reckless or unpadded packaging, deductions may apply to the final refund value.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Merchant Inspection & Quality Assurance Protocol",
          badge: "Inspection SLA",
          body: (
            <>
              <p>
                Once the returned item is delivered back to the merchant or Verndly fulfillment inspection center:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>The merchant has <strong>forty-eight (48) hours</strong> to physically inspect the returned parcel, verify the reported defect, and confirm that all original accessories and serial numbers match the initial dispatch record.</li>
                <li>If the merchant approves the return, or fails to act within the 48-hour inspection SLA, the escrow system automatically triggers immediate refund execution.</li>
                <li>If the merchant disputes the condition of the return (e.g. claims the buyer returned a different or used item), the claim is escalated to Verndly Trust &amp; Safety for binding arbitration.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Refund Execution Timelines & Payment Channels",
          badge: "Disbursement Timelines",
          body: (
            <>
              <p>
                Approved refunds are executed immediately through Paystack and credited directly back to the original payment method
                used during initial checkout:
              </p>
              <div className="space-y-3 text-xs md:text-sm">
                <div className="p-4 rounded-xl bg-surface border border-border/70 flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-foreground">Mobile Money (MTN, Telecel, AT):</strong>
                    <p className="text-muted-foreground mt-0.5">Refunds credited directly to your mobile money wallet within <strong>24 to 48 hours</strong> of execution.</p>
                  </div>
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">1–2 Days</span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-foreground">Local &amp; International Debit/Credit Cards (Visa, Mastercard):</strong>
                    <p className="text-muted-foreground mt-0.5">Refunds credited back to your bank account statement within <strong>3 to 7 business days</strong>, depending on your issuing bank&apos;s interbank clearing cycle.</p>
                  </div>
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">3–7 Days</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Full Shipping Refund:</strong> When an entire order is returned due to defect, transit damage, or merchant fulfillment error, your refund includes 100% of the initial delivery fee paid at checkout.
              </p>
            </>
          ),
        },
        {
          title: "Dispute Escalation & Verndly Escrow Mediation",
          badge: "Impartial Arbitration",
          body: (
            <>
              <p>
                In the rare event that a Buyer and Seller cannot reach an amicable resolution within forty-eight (48) hours of a return
                inquiry, either party may escalate the case to Verndly Trust &amp; Safety by clicking <strong>&quot;Escalate to Verndly Support&quot;</strong>.
              </p>
              <p>
                <strong>The Mediation Process:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Both parties are requested to submit supporting documentation (photos, courier waybills, chat transcripts).</li>
                <li>Verndly compliance officers review the evidence impartially under these published standards.</li>
                <li>Verndly issues a binding administrative determination. If the buyer&apos;s claim is verified, Verndly will unilaterally disburse a 100% escrow refund directly to the buyer, irrespective of merchant resistance.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Fraud Prevention & Return Policy Abuse",
          badge: "Integrity Standards",
          body: (
            <>
              <p>
                To maintain a fair, trusted marketplace for honest entrepreneurs and consumers, Verndly enforces strict anti-abuse
                measures against return fraud:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Prohibited Conduct:</strong> Returning substitute or counterfeit goods, returning empty parcels, engaging in &quot;wardrobing&quot; (purchasing items for temporary event use with intent to return), or filing false transit damage claims.
                </li>
                <li>
                  <strong>Enforcement Consequences:</strong> Accounts found engaging in pattern return fraud will have their buyer protection revoked, pending refunds denied, accounts permanently closed, and may face civil recovery or referral to law enforcement agencies for investigation.
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground">
                <strong>Direct Dispute Support:</strong><br />
                Have questions or need assistance with an ongoing return? Contact our Buyer Protection Desk at{" "}
                <a href="mailto:disputes@verndly.com" className="text-primary underline">disputes@verndly.com</a> or message our official support WhatsApp at +233 53 406 5652 quoting your Order Number.
              </div>
            </>
          ),
        },
      ]}
      />
    </>
  );
}

