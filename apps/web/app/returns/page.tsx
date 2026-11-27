import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import Link from 'next/link';
import FaqJsonLd from '@/components/seo/FaqJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { buildMetadata } from '@/lib/seo';
import { SUPPORT_CONTACT } from '@/lib/contact';

export const metadata: Metadata = buildMetadata({
  title: '3-Day Buyer Protection, Returns & Refunds Policy',
  description:
    'Official 3-Day Buyer Protection policy for Verndly Ghana: when you can request a return, how escrow refunds work, and how to escalate an unresolved claim to support.',
  path: '/returns',
});

const RETURNS_FAQ = [
  {
    question: 'How long is the return window on Verndly?',
    answer:
      'Buyers have three (3) calendar days starting from the recorded delivery confirmation timestamp to inspect their purchase and file a return claim.',
  },
  {
    question: 'How does the escrow protection work during returns?',
    answer:
      'Funds paid online via Paystack are held in secure escrow settlement accounts and are not disbursed to the seller until the 3-day buyer protection window passes without dispute.',
  },
  {
    question: 'How quickly are approved refunds processed?',
    answer:
      'When a seller or Verndly support approves a refund, Paystack sends it back to the Mobile Money wallet or card used at checkout.',
  },
  {
    question: 'What happens if a seller rejects my return claim?',
    answer:
      'Open the order and escalate the claim to Verndly support. Support reviews what you submitted and can issue a Paystack refund if the claim is valid.',
  },
];

export default function ReturnsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Returns Policy', path: '/returns' },
        ]}
      />
      <FaqJsonLd items={RETURNS_FAQ} />
      <LegalPage
        eyebrow="Buyer Protection & Peace of Mind"
        title="Returns & Refunds Policy"
        description="Every purchase on Verndly is backed by escrow-protected 3-Day Buyer Protection. If your order arrives damaged, defective, or materially different from the seller's listing, request a return from the order and receive a Paystack refund when the claim is approved."
        updatedAt="November 2026"
        sections={[
          {
            title: 'Verndly 3-Day Buyer Protection Guarantee',
            badge: 'Escrow Assurance',
            body: (
              <>
                <p>
                  When you shop on Verndly, you are protected by our multi-layered Buyer Protection
                  framework. Payments made online via Paystack are held in secure escrow settlement
                  accounts and are not disbursed to the merchant until the item is delivered and you
                  have had a full opportunity to inspect your purchase.
                </p>
                <div className="bg-surface border-border/70 text-muted-foreground rounded-xl border p-4 text-xs leading-relaxed">
                  <strong>The Verndly Guarantee:</strong> You can request a full refund if: (a) your
                  order never arrives; (b) the item arrives broken or damaged in transit; (c) the
                  item has manufacturing defects or does not function as described; or (d) the
                  merchandise delivered is materially different in model, brand, color, or condition
                  from the seller&apos;s product listing.
                </div>
              </>
            ),
          },
          {
            title: 'Inspection Window & Return Eligibility Standards',
            badge: '3-Day Window',
            body: (
              <>
                <p>
                  The return window spans <strong>three (3) calendar days</strong>, starting from
                  the delivery time recorded on your order.
                </p>
                <p>
                  To qualify for a valid return and refund, items must satisfy the following
                  physical condition standards:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    The item must be in its original condition, with no customer-inflicted
                    scratches, stains, tears, or signs of wear.
                  </li>
                  <li>
                    All original packaging, manufacturer boxes, anti-tamper seals, warranty cards,
                    manuals, and accessories must be returned intact.
                  </li>
                  <li>
                    For consumer electronics and smart devices, all personal accounts (Google, Apple
                    ID, Samsung accounts) must be completely unlinked and factory reset prior to
                    return handover.
                  </li>
                  <li>
                    Garments, footwear, and fashion accessories must have all original brand tags,
                    labels, and hygiene liners intact and unremoved.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Valid Grounds for Return & Replacement',
            badge: 'Eligible Claims',
            body: (
              <>
                <p>
                  Return and refund claims are approved under the following verified circumstances:
                </p>
                <div className="grid grid-cols-1 gap-3 pt-1 text-xs md:grid-cols-2 md:text-sm">
                  <div className="bg-surface border-border/70 space-y-1 rounded-xl border p-3.5">
                    <strong className="text-foreground">1. Damaged in Transit</strong>
                    <p className="text-muted-foreground">
                      The package arrived cracked, broken, crushed, or visibly damaged during
                      courier transit.
                    </p>
                  </div>
                  <div className="bg-surface border-border/70 space-y-1 rounded-xl border p-3.5">
                    <strong className="text-foreground">2. Defective / Non-Functional</strong>
                    <p className="text-muted-foreground">
                      The item does not power on, fails to perform advertised functions, or
                      possesses hardware flaws.
                    </p>
                  </div>
                  <div className="bg-surface border-border/70 space-y-1 rounded-xl border p-3.5">
                    <strong className="text-foreground">3. Materially Different Listing</strong>
                    <p className="text-muted-foreground">
                      The delivered item differs significantly in brand, model, size, color,
                      condition, or specifications.
                    </p>
                  </div>
                  <div className="bg-surface border-border/70 space-y-1 rounded-xl border p-3.5">
                    <strong className="text-foreground">4. Incomplete or Missing Parts</strong>
                    <p className="text-muted-foreground">
                      The package was missing essential cables, bundled accessories, or key parts
                      advertised in the listing.
                    </p>
                  </div>
                </div>
              </>
            ),
          },
          {
            title: 'Non-Returnable & Restricted Categories',
            badge: 'Policy Exclusions',
            body: (
              <>
                <p>
                  In accordance with statutory health, safety, and consumer hygiene regulations, the
                  following categories are strictly non-returnable and non-refundable, unless
                  received in a damaged or defective state upon initial delivery:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Personal Hygiene &amp; Intimate Goods:</strong> Underwear, lingerie,
                    swimwear, earrings, hair accessories, cosmetics, skincare formulations, and
                    perfumes once the protective hygiene seal has been broken or unsealed.
                  </li>
                  <li>
                    <strong>Perishable Consumer Goods:</strong> Fresh food items, beverages,
                    perishable grocery goods, and fresh flowers with short shelf lives.
                  </li>
                  <li>
                    <strong>Custom &amp; Personalized Items:</strong> Products made to custom
                    specifications, engraved jewelry, customized apparel, or tailor-made merchandise
                    that cannot be resold.
                  </li>
                  <li>
                    <strong>Digital &amp; Virtual Products:</strong> Delivered software serial keys,
                    gift cards, digital vouchers, or prepaid download codes.
                  </li>
                  <li>
                    <strong>Customer-Damaged Items:</strong> Goods damaged through customer misuse,
                    liquid exposure, unauthorized electrical surges, physical drops, or unapproved
                    repair attempts.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Step-by-Step Return Request Workflow',
            badge: 'Return Process',
            body: (
              <>
                <p>
                  Initiating a return on Verndly is fully digitalized and tracked directly through
                  your account:
                </p>
                <ol className="list-decimal space-y-2.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Locate Your Order:</strong> Sign in and navigate to{' '}
                    <Link href="/orders" className="text-primary underline">
                      My Orders
                    </Link>
                    . Select the order containing the item you wish to return.
                  </li>
                  <li>
                    <strong>Initiate Request:</strong> Click the{' '}
                    <strong>&quot;Request Return&quot;</strong> button. Select the appropriate
                    return reason from the dropdown menu (e.g. Defective, Damaged in Transit,
                    Incorrect Item).
                  </li>
                  <li>
                    <strong>Describe the issue:</strong> Choose a reason and write what went wrong.
                    The form requires a description of at least 20 characters.
                  </li>
                  <li>
                    <strong>Seller review:</strong> The seller is notified and asked to respond
                    within 48 hours. They can approve a Paystack refund or reject the claim. That
                    timer is not automatic — if it stays unresolved, escalate from the order.
                  </li>
                  <li>
                    <strong>Hand the item back:</strong> If the seller asks for the item to be
                    returned, arrange that handover with them. Verndly does not issue return
                    waybills, book a courier, or run a pickup service.
                  </li>
                </ol>
              </>
            ),
          },
          {
            title: 'Returning the Item',
            badge: 'No Verndly Pickup',
            body: (
              <>
                <p>
                  Verndly does not run a fulfillment center, inspection center, or return courier.
                  There is no platform waybill and no free pickup arranged by Verndly.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Seller error:</strong> For a damaged, defective, or wrong item, ask the
                    seller how they want it sent back. Any courier cost is between you and the
                    seller. Verndly does not book or pay for that pickup.
                  </li>
                  <li>
                    <strong>Change of mind:</strong> A return because you changed your mind is only
                    possible if that seller agrees. You arrange and pay for sending the item back.
                  </li>
                  <li>
                    <strong>Packaging:</strong> Pack the item so it arrives back in the condition
                    you received it, with original tags, accessories, and packaging where you still
                    have them.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'After the Item Is Back with the Seller',
            badge: 'Seller Review',
            body: (
              <>
                <p>
                  Returned goods go back to the selling merchant. Verndly does not receive or
                  inspect parcels at a warehouse.
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    The seller confirms they have the item from the order page and can issue the
                    Paystack refund.
                  </li>
                  <li>
                    Missing the 48-hour response window does not refund you automatically. Escrow
                    stays held while a return request is open, and a refund happens only when the
                    seller or Verndly support approves it.
                  </li>
                  <li>
                    If the seller rejects the claim or disagrees about the item&apos;s condition,
                    escalate that order to Verndly support.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Refund Execution Timelines & Payment Channels',
            badge: 'Disbursement Timelines',
            body: (
              <>
                <p>
                  Approved refunds are sent through Paystack to the Mobile Money wallet or card used
                  at checkout:
                </p>
                <div className="space-y-3 text-xs md:text-sm">
                  <div className="bg-surface border-border/70 flex items-start justify-between gap-4 rounded-xl border p-4">
                    <div>
                      <strong className="text-foreground">Mobile Money (MTN, Telecel, AT):</strong>
                      <p className="text-muted-foreground mt-0.5">
                        Refunds credited directly to your mobile money wallet within{' '}
                        <strong>24 to 48 hours</strong> of execution.
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      1–2 Days
                    </span>
                  </div>

                  <div className="bg-surface border-border/70 flex items-start justify-between gap-4 rounded-xl border p-4">
                    <div>
                      <strong className="text-foreground">
                        Local &amp; International Debit/Credit Cards (Visa, Mastercard):
                      </strong>
                      <p className="text-muted-foreground mt-0.5">
                        Refunds credited back to your bank account statement within{' '}
                        <strong>3 to 7 business days</strong>, depending on your issuing bank&apos;s
                        interbank clearing cycle.
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      3–7 Days
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  An approved refund is the amount paid on that order through Paystack, unless
                  support records a different amount.
                </p>
              </>
            ),
          },
          {
            title: 'Escalating an Unresolved Claim',
            badge: 'Support Review',
            body: (
              <>
                <p>
                  If the seller rejects your return or leaves it unresolved, open the order and
                  escalate it to Verndly support. Only the buyer can start that escalation, and it
                  marks the return as escalated and notifies the seller.
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>Support reviews the reason and description already on the return request.</li>
                  <li>
                    This is a support review, not a separate inspection center or a formal
                    arbitration hearing.
                  </li>
                  <li>
                    If the claim is valid, support can issue the Paystack refund from the admin
                    tools. A refund is not automatic.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Fraud Prevention & Return Policy Abuse',
            badge: 'Integrity Standards',
            body: (
              <>
                <p>
                  To maintain a fair, trusted marketplace for honest entrepreneurs and consumers,
                  Verndly enforces strict anti-abuse measures against return fraud:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Prohibited Conduct:</strong> Returning substitute or counterfeit goods,
                    returning empty parcels, engaging in &quot;wardrobing&quot; (purchasing items
                    for temporary event use with intent to return), or filing false transit damage
                    claims.
                  </li>
                  <li>
                    <strong>Enforcement Consequences:</strong> Accounts found engaging in pattern
                    return fraud will have their buyer protection revoked, pending refunds denied,
                    accounts permanently closed, and may face civil recovery or referral to law
                    enforcement agencies for investigation.
                  </li>
                </ul>
                <div className="bg-surface border-border/70 text-muted-foreground rounded-xl border p-4 text-xs">
                  <strong>Direct Dispute Support:</strong>
                  <br />
                  Have questions or need assistance with an ongoing return? Email{' '}
                  <a href={SUPPORT_CONTACT.emailHref} className="text-primary underline">
                    {SUPPORT_CONTACT.email}
                  </a>{' '}
                  or message support on WhatsApp at {SUPPORT_CONTACT.phoneDisplay} and include your
                  order number.
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
