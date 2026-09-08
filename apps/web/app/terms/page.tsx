import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · Verndly",
  description:
    "Master conditions of use, buyer rights, merchant obligations, escrow protection, and commercial terms for the Verndly marketplace.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Marketplace Agreement"
      title="Terms of Service & Conditions of Use"
      description="These terms constitute a legally binding contract between you and Verndly. Please review them in full. They outline your statutory consumer rights, merchant standards, transaction rules, escrow mechanics, and the legal framework governing commerce across the platform."
      updatedAt="September 2026"
      sections={[
        {
          title: "Contractual Relationship & Acceptance of Terms",
          badge: "Scope & Binding Effect",
          body: (
            <>
              <p>
                Welcome to Verndly (&quot;Verndly&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Service,
                together with our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>,{" "}
                <Link href="/returns" className="text-primary underline">Returns &amp; Refunds Policy</Link>, and{" "}
                <Link href="/shipping" className="text-primary underline">Shipping &amp; Delivery Policy</Link>,
                govern your access to and use of the Verndly website (verndly.com), mobile interfaces, merchant APIs,
                and related applications (collectively, the &quot;Platform&quot;).
              </p>
              <p>
                By creating an account, browsing storefronts, placing orders, listing products, or engaging in transactions
                on the Platform, you expressly represent and warrant that you have read, understood, and agreed to be legally
                bound by these Terms. If you do not agree to these Terms in their entirety, you are strictly prohibited from
                using or accessing the Platform.
              </p>
              <p>
                These Terms apply equally to all visitors, buyers, registered merchants, and corporate representatives.
                Electronic signatures, click-through confirmations, and electronic notices delivered via email or dashboard
                notifications satisfy all statutory requirements for written legal communication under applicable Electronic
                Transactions legislation.
              </p>
            </>
          ),
        },
        {
          title: "Marketplace Operator Model & Role of Verndly",
          badge: "Platform Infrastructure",
          body: (
            <>
              <p>
                Verndly is a multi-vendor digital commerce marketplace infrastructure. We empower independent businesses,
                young entrepreneurs, artisans, and registered merchants to establish branded storefronts, showcase catalogs,
                and transact directly with retail consumers.
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed">
                <strong>Important Legal Notice:</strong> Except where an item is explicitly marked as &quot;Sold by Verndly&quot;,
                Verndly is not the manufacturer, supplier, distributor, or legal seller of goods listed on the Platform.
                When you purchase a product, the contract of sale is executed directly between you (the &quot;Buyer&quot;) and the
                independent merchant (the &quot;Seller&quot;). Verndly acts solely as the marketplace facilitator, technological host,
                and limited payment escrow agent.
              </div>
              <p>
                While Verndly enforces rigorous merchant vetting, identity verification, catalog guidelines, and 7-day buyer
                protection, Verndly is not a party to the underlying commercial contract between Buyer and Seller, does not take
                legal title to merchant merchandise, and does not hold physical custody of goods in transit.
              </p>
            </>
          ),
        },
        {
          title: "Eligibility, Account Registration & Credential Security",
          badge: "Account Ownership",
          body: (
            <>
              <p>
                To create an account and transact on Verndly, you must be at least 18 years old or the legal age of majority in your
                jurisdiction, with full legal capacity to enter into binding contracts. Individuals aged 16 to 17 may use the
                Platform solely under the active supervision of a parent or legal guardian who accepts legal responsibility for all
                transactions.
              </p>
              <p>
                When registering, you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Provide truthful, accurate, current, and complete personal and business details.</li>
                <li>Promptly update your profile to maintain accurate billing, delivery, and contact information.</li>
                <li>Maintain the confidentiality of your authentication credentials, session tokens, and passwords.</li>
                <li>Assume sole legal and financial responsibility for all activities occurring under your authenticated account.</li>
              </ul>
              <p>
                Accounts are non-transferable. You may not license, assign, sell, or rent your account or merchant storefront
                to any third party. You must notify our Security Operations Center immediately at{" "}
                <a href="mailto:security@verndly.com" className="text-primary underline">security@verndly.com</a> if you discover
                or suspect any unauthorized access or breach of security.
              </p>
            </>
          ),
        },
        {
          title: "Seller Verification, KYC Standards & Merchant Vetting",
          badge: "Merchant Compliance",
          body: (
            <>
              <p>
                To protect consumer trust and comply with statutory Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF)
                regulations, every merchant seeking to sell on Verndly must undergo our mandatory Know Your Customer (KYC) onboarding
                procedure before listings are indexed or payouts are processed.
              </p>
              <p>
                Verification requirements include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Proof of Identity:</strong> Government-issued photo identification (Ghana Card, National Passport, or Voter ID).
                </li>
                <li>
                  <strong>Business Standing:</strong> Valid proof of business operation, registered enterprise certificates (where incorporated), or verified commercial location.
                </li>
                <li>
                  <strong>Settlement Account Verification:</strong> Active, matching bank account or registered Mobile Money account (MTN Mobile Money, Telecel Cash, or AT Money) in the merchant&apos;s verified legal name.
                </li>
                <li>
                  <strong>Active Contactability:</strong> Verified mobile phone number and responsive business WhatsApp contact for fulfillment alerts and customer inquiries.
                </li>
              </ul>
              <p>
                Verndly reserves the absolute right to re-verify merchant credentials periodically, request supplemental documentation,
                or immediately suspend storefront operations where verification discrepancies, fraudulent submissions, or suspicious
                ownership structures arise.
              </p>
            </>
          ),
        },
        {
          title: "Product Listings, Specifications & Truth-in-Advertising",
          badge: "Catalog Standards",
          body: (
            <>
              <p>
                Sellers are legally responsible for all content, images, specifications, and claims published within their storefronts.
                All listings must comply with fair trading and consumer protection standards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Authentic Photography:</strong> Listings must feature high-resolution, actual photographs of the physical item. Use of misleading mockups, uncredited third-party copyrighted images, or digital assets that misrepresent item quality is prohibited.
                </li>
                <li>
                  <strong>Condition Accuracy:</strong> Items must be truthfully categorized as <em>New</em>, <em>Refurbished</em>, or <em>Like New / Pre-Owned</em>. Any functional defects, cosmetic flaws, or packaging anomalies must be explicitly disclosed in the item description.
                </li>
                <li>
                  <strong>Inventory Integrity:</strong> Sellers may only list products that are currently in stock and physically available for dispatch within their declared fulfillment window.
                </li>
                <li>
                  <strong>Pricing Transparency:</strong> Prices must be displayed clearly in Ghana Cedis (GHS), inclusive of all applicable statutory consumption taxes. Hidden charges, surprise checkout surcharges, and deceptive discount manipulation (&quot;artificial price inflation followed by fake sales&quot;) are grounds for immediate catalog removal.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Order Placement, Contract Formation & Order Cancellation",
          badge: "Order Mechanics",
          body: (
            <>
              <p>
                When a Buyer completes checkout on the Platform, the order constitutes an official commercial offer to purchase the specified merchandise. An order is formally accepted, forming a legally binding sales contract between Buyer and Seller, upon:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Successful authorization and confirmation of payment via our verified payment gateway (Paystack); and</li>
                <li>Transmission of an electronic Order Confirmation notification from Verndly to the Buyer&apos;s registered email address.</li>
              </ul>
              <p>
                <strong>Merchant Order Cancellations:</strong> If a merchant cannot fulfill an accepted order due to unforeseen inventory loss, damaged stock, or courier service unavailability, the merchant must cancel the order promptly through their Seller Dashboard. The Buyer will automatically receive an immediate, full 100% refund of all funds paid, including shipping costs.
              </p>
              <p>
                <strong>Buyer Order Cancellations:</strong> Buyers may request order cancellation prior to item dispatch by contacting the seller via their storefront or opening an order inquiry. Once an item has been marked as <em>Dispatched</em> or assigned a tracking waybill, the order cannot be cancelled mid-transit and must be processed under our <Link href="/returns" className="text-primary underline">Returns &amp; Refunds Policy</Link>.
              </p>
            </>
          ),
        },
        {
          title: "Payment Processing, Escrow Protection & Settlement",
          badge: "Financial Security",
          body: (
            <>
              <p>
                All online monetary transactions on Verndly are processed through licensed, PCI-DSS Level 1 certified financial infrastructure partners, primarily Paystack Payments Limited, supporting secure payment via Visa, Mastercard, and Mobile Money (MTN, Telecel, AT).
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  <strong>Verndly Escrow Protection:</strong> To protect buyers and sellers against fraud, payments made for marketplace orders are held securely in a segregated settlement holding account. Funds are not immediately exposed to vendor withdrawal until:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[12px]">
                  <li>The seller dispatches the package and provides verified courier tracking or delivery receipt;</li>
                  <li>The item is marked delivered by the courier partner or verified by customer confirmation; and</li>
                  <li>The statutory 7-day buyer protection inspection window expires without an unresolved dispute.</li>
                </ol>
              </div>
              <p>
                Buyers pay zero payment processing markups or transaction fees. Sellers agree that all disbursements are executed net of the platform commission fee and any agreed courier settlement obligations.
              </p>
            </>
          ),
        },
        {
          title: "Platform Fees & Merchant Settlement Structure",
          badge: "Transparent 4% Commission",
          body: (
            <>
              <p>
                Verndly operates on an equitable, transparent revenue model engineered for sustainable entrepreneurship:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Flat 4% Platform Fee:</strong> Verndly retains a flat four percent (4.00%) platform commission on the gross merchandise value of completed sales. The remaining ninety-six percent (96.00%) net sales revenue is disbursed directly to the merchant.
                </li>
                <li>
                  <strong>Zero Buyer Surcharges:</strong> Buyers are never charged platform facilitation fees, payment gateway processing fees, or membership charges. What the buyer sees at checkout is exactly what the buyer pays.
                </li>
                <li>
                  <strong>Automated Payouts:</strong> For merchants configured with verified Paystack subaccounts, earnings are settled automatically following the clearance of order inspection windows. For other merchants, payouts are processed via scheduled batch transfers directly to their linked Mobile Money or commercial bank accounts.
                </li>
                <li>
                  <strong>Official Receipts:</strong> Every payout execution generates an official electronic Payout Receipt, complete with reference number, transfer ID, and itemized fee breakdown, transmitted to the merchant&apos;s registered email address.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Fulfillment Obligations, Shipping & Risk of Transit",
          badge: "Logistics Standards",
          body: (
            <>
              <p>
                Every merchant is legally bound to fulfill accepted orders in strict accordance with their published shipping parameters and our <Link href="/shipping" className="text-primary underline">Shipping &amp; Delivery Policy</Link>:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Dispatch Windows:</strong> Merchants must hand over packaged merchandise to the designated delivery courier within their committed dispatch window (e.g. Same-Day, 24 Hours, or 2–3 Business Days).
                </li>
                <li>
                  <strong>Packaging Integrity:</strong> Merchandise must be packaged securely in protective materials to withstand standard road transit. Inadequate packaging resulting in in-transit damage is the legal liability of the seller.
                </li>
                <li>
                  <strong>Risk of Loss:</strong> Risk of loss or damage to goods remains with the merchant until physical custody is delivered and acknowledged by the Buyer or recipient at the declared delivery destination.
                </li>
                <li>
                  <strong>Proof of Delivery:</strong> Merchants and courier partners must obtain valid proof of delivery (digital waybill signature, recipient identity verification, or recipient SMS/WhatsApp confirmation code).
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "7-Day Buyer Protection, Returns & Refunds",
          badge: "Consumer Rights",
          body: (
            <>
              <p>
                Every transaction completed on Verndly is backed by our comprehensive 7-Day Buyer Protection Policy. Buyers are entitled to open a return request within seven (7) calendar days of delivery if:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>The item delivered is defective, non-functional, or dead-on-arrival;</li>
                <li>The item was damaged in transit prior to delivery;</li>
                <li>The item is materially different from the merchant&apos;s listing photos, brand, or specifications; or</li>
                <li>An incorrect item, size, color, or variant was dispatched.</li>
              </ul>
              <p>
                Certain categories are strictly non-returnable for health, safety, and digital integrity reasons, including unsealed personal hygiene goods, perishable food items, customized/engraved merchandise, and delivered digital vouchers. Full procedural workflows and dispute arbitration guidelines are detailed in our dedicated <Link href="/returns" className="text-primary underline">Returns &amp; Refunds Policy</Link>.
              </p>
            </>
          ),
        },
        {
          title: "Prohibited Goods, Counterfeit Policy & Intellectual Property",
          badge: "Zero Tolerance",
          body: (
            <>
              <p>
                Verndly strictly prohibits the listing, marketing, sale, or distribution of counterfeit, dangerous, or illegal items. Prohibited categories include, without limitation:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Counterfeit, knock-off, replica, or unauthorized branded merchandise.</li>
                <li>Narcotics, controlled pharmaceuticals, prescription medicines, or recreational drug paraphernalia.</li>
                <li>Firearms, ammunition, tactical weapons, explosive devices, or military equipment.</li>
                <li>Stolen property, unverified second-hand electronics with active iCloud/Google locks, or contraband goods.</li>
                <li>Pornography, sexually explicit media, or offensive materials.</li>
                <li>Hazardous chemicals, uncertified skin-bleaching compounds, or toxic materials.</li>
                <li>Unlicensed digital software keys, cracked credentials, or pyramid marketing schemes.</li>
              </ul>
              <p>
                Listing prohibited items results in immediate product removal, permanent forfeiture of pending sales proceeds, permanent store termination, and formal reporting to domestic law enforcement authorities.
              </p>
            </>
          ),
        },
        {
          title: "Anti-Circumvention & Off-Platform Solicitation",
          badge: "Platform Integrity",
          body: (
            <>
              <p>
                Verndly invests heavily in merchant discovery, search optimization, secure payment processing, marketing, and escrow infrastructure. To preserve platform integrity and protect buyers against unsecured transactions:
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed">
                <strong>Strict Non-Circumvention Rule:</strong> Merchants and buyers are strictly prohibited from soliciting, offering, or executing off-platform transactions to circumvent Verndly&apos;s 4% platform fee or escrow safeguards. This includes posting private banking account numbers in item descriptions, instructing customers via messages to pay via private cash transfers, or cancelling orders on Verndly after making private fulfillment arrangements.
              </div>
              <p>
                Transactions conducted off-platform forfeit all Verndly Buyer Protection, escrow insurance, and refund dispute mediation. Accounts found engaging in fee circumvention will face immediate suspension, financial penalty deductions from balance reserves, and permanent platform ban.
              </p>
            </>
          ),
        },
        {
          title: "Ratings, Customer Reviews & Community Integrity",
          badge: "Authentic Feedback",
          body: (
            <>
              <p>
                The Verndly review and rating system is engineered to foster authentic merchant accountability. Buyers who have completed verified orders may publish ratings and written feedback regarding their commercial experience.
              </p>
              <p>
                The following practices constitute serious policy violations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Posting fake, paid, or incentivized reviews (including self-purchases to boost store rating).</li>
                <li>Coercing, harassing, or threatening customers to force removal or alteration of legitimate negative feedback.</li>
                <li>Publishing defamatory, obscene, racist, or abusive content within reviews.</li>
              </ul>
              <p>
                Verndly utilizes automated sentiment analysis and human moderation. We reserve the right to remove any review that violates our community standards, while never censoring honest, factual consumer feedback.
              </p>
            </>
          ),
        },
        {
          title: "Intellectual Property Ownership & Notice-and-Takedown",
          badge: "Copyright & IP",
          body: (
            <>
              <p>
                All proprietary software, platform designs, source code, logos, visual brand identities, and graphical assets associated with Verndly are the exclusive intellectual property of Verndly and protected by international copyright and trademark laws.
              </p>
              <p>
                <strong>User Content License:</strong> By publishing store logos, brand bios, and product images on Verndly, merchants grant Verndly a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute such assets strictly for marketing, indexing, and facilitating storefront commerce.
              </p>
              <p>
                <strong>IP Infringement Takedown:</strong> If you are a trademark owner, brand representative, or copyright holder and believe that a product listed on Verndly infringes your intellectual property rights, please submit a formal Notice of Infringement to{" "}
                <a href="mailto:ip@verndly.com" className="text-primary underline">ip@verndly.com</a> containing: (a) proof of ownership; (b) specific listing URLs; and (c) a statement under penalty of perjury confirming your good-faith belief of infringement. Valid notices are processed and infringing listings removed within 24 business hours.
              </p>
            </>
          ),
        },
        {
          title: "Account Suspension, Deactivation & Store Termination",
          badge: "Enforcement",
          body: (
            <>
              <p>
                Verndly reserves the right, in its sole and reasonable discretion, to issue formal warnings, temporarily restrict account features, remove listings, or permanently terminate account access without prior notice if:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>You breach any material provision of these Terms or related marketplace policies;</li>
                <li>You engage in fraudulent, deceptive, or unlawful commercial behavior;</li>
                <li>Your store demonstrates an unacceptably high order cancellation rate (&gt;10%), severe dispatch delays, or excessive chargeback disputes;</li>
                <li>You fail identity re-verification or supply fraudulent KYC credentials; or</li>
                <li>Continued operation of your account poses legal, financial, or security risks to Verndly or other users.</li>
              </ul>
              <p>
                Upon termination, your storefront and listings will be deactivated immediately. Legitimate pending funds earned prior to termination will be settled following a standard 30-day reserve holding period to cover potential customer chargebacks and return claims.
              </p>
            </>
          ),
        },
        {
          title: "Disclaimers & Warranties",
          badge: "Legal Disclaimers",
          body: (
            <>
              <p>
                EXCEPT AS EXPRESSLY PROVIDED HEREIN, THE VERNDLY PLATFORM, ITS SERVERS, INFRASTRUCTURE, APIS, AND SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
              </p>
              <p>
                VERNDLY DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT PLATFORM SERVICES WILL BE UNINTERRUPTED, COMPLETELY SECURE, ERROR-FREE, OR FREE FROM HARMFUL CODE, OR THAT ANY DEFECTS WILL BE IMMEDIATELY CORRECTED.
              </p>
              <p>
                MERCHANT PRODUCT WARRANTIES (IF ANY) ARE PROVIDED SOLELY BY THE RESPECTIVE INDEPENDENT SELLER OR MANUFACTURER. VERNDLY DOES NOT INDEPENDENTLY WARRANT THE SAFETY, RELIABILITY, DURABILITY, OR PERFORMANCE OF GOODS PURCHASED FROM INDEPENDENT VENDORS.
              </p>
            </>
          ),
        },
        {
          title: "Limitation of Liability",
          badge: "Liability Cap",
          body: (
            <>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE CONSUMER PROTECTION AND COMMERCIAL LAW:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  IN NO EVENT SHALL VERNDLY, ITS DIRECTORS, OFFICERS, EMPLOYEES, AFFILIATES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF BUSINESS OPPORTUNITIES, LOSS OF REPUTATION, OR LOSS OF DATA, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM.
                </li>
                <li>
                  VERNDLY&apos;S TOTAL AGGREGATE LIABILITY ARISING FROM ALL CLAIMS RELATING TO ANY TRANSACTION OR YOUR USE OF THE PLATFORM SHALL IN ALL CIRCUMSTANCES BE STRICTLY LIMITED TO AND CAPPED AT: (A) FOR BUYERS, THE TOTAL PURCHASE PRICE PAID FOR THE ORDER GIVING RISE TO THE CLAIM; OR (B) FOR MERCHANTS, THE TOTAL NET COMMISSION FEES PAID BY THE MERCHANT TO VERNDLY IN THE PRECEDING TWELVE (12) MONTHS.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Indemnification",
          badge: "Mutual Protection",
          body: (
            <>
              <p>
                You agree to defend, indemnify, and hold harmless Verndly, its parent, subsidiaries, affiliates, officers, directors,
                agents, and employees from and against any third-party claims, liabilities, losses, damages, fines, penalties, judgments,
                and expenses (including reasonable legal fees) arising out of or related to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>Your breach or violation of these Terms or applicable statutory laws;</li>
                <li>Your products, listings, descriptions, fulfillment failures, or defects in merchandise sold;</li>
                <li>Any infringement or misappropriation of third-party intellectual property, privacy, or proprietary rights caused by your content or merchandise; or</li>
                <li>Your negligent acts, willful misconduct, or unauthorized access to the Platform.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Dispute Resolution, Arbitration & Governing Law",
          badge: "Legal Jurisdiction",
          body: (
            <>
              <p>
                <strong>Informal Dispute Resolution:</strong> Prior to initiating formal legal proceedings, you and Verndly agree to attempt in good faith to resolve any claim, controversy, or dispute arising out of or relating to these Terms or marketplace operations through informal negotiations. Notice of dispute must be submitted in writing to <a href="mailto:legal@verndly.com" className="text-primary underline">legal@verndly.com</a>.
              </p>
              <p>
                <strong>Platform Mediation:</strong> For disputes between Buyers and Sellers regarding order fulfillment, delivery discrepancies, or damaged goods, parties agree to submit the matter to Verndly Trust &amp; Safety for binding administrative mediation as provided in our Returns Policy.
              </p>
              <p>
                <strong>Governing Law &amp; Jurisdiction:</strong> These Terms and any dispute arising out of or in connection with them shall be governed by, construed, and enforced in accordance with the laws of the Republic of Ghana, without regard to conflict of law principles. Any legal suit, action, or proceeding that cannot be resolved amicably shall be instituted exclusively in the competent commercial courts of Accra, Ghana.
              </p>
            </>
          ),
        },
        {
          title: "Amendments, Severability & Official Inquiries",
          badge: "General Provisions",
          body: (
            <>
              <p>
                <strong>Policy Revisions:</strong> We reserve the right to modify, amend, or replace these Terms at any time to reflect legislative updates, statutory guidelines, or platform enhancements. Material changes will be communicated via prominent dashboard notifications or direct email at least seven (7) days prior to taking effect. Your continued use of the Platform following the effective date constitutes full acceptance of the revised Terms.
              </p>
              <p>
                <strong>Severability:</strong> If any provision of these Terms is determined by a court of competent jurisdiction to be invalid, illegal, or unenforceable, such provision shall be severed or modified to the minimum extent necessary, and all remaining provisions shall continue in full force and effect.
              </p>
              <p>
                <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, Returns &amp; Refunds Policy, and Shipping Policy, constitute the entire, complete agreement between you and Verndly regarding the use of the Platform, superseding all prior oral or written agreements.
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground">
                <strong>Official Registered Contact:</strong><br />
                Verndly Commerce &amp; Financial Services Limited<br />
                Accra, Greater Accra Region, Ghana<br />
                General Legal Inquiries: <a href="mailto:legal@verndly.com" className="text-primary underline">legal@verndly.com</a><br />
                Support &amp; Partner Desk: <a href="mailto:support@verndly.com" className="text-primary underline">support@verndly.com</a> | WhatsApp: +233 53 406 5652
              </div>
            </>
          ),
        },
      ]}
    />
  );
}
