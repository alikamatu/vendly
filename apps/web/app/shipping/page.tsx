import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { COVERAGE_COPY } from '@/lib/copy/coverage';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping & Delivery Policy',
  description:
    'Logistics guidelines, merchant dispatch windows, seller-configured delivery zones in Ghana, tracking, and lost parcel protection on Verndly.',
  path: '/shipping',
  keywords: ['verndly shipping', 'ghana courier delivery', 'accra delivery and pickup'],
});

export default function ShippingPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Shipping & Delivery', path: '/shipping' },
        ]}
      />
      <LegalPage
        eyebrow="Logistics & Delivery Standards"
        title="Shipping, Dispatch & Delivery Policy"
        description={COVERAGE_COPY.shippingIntro}
        updatedAt="September 2026"
        sections={[
          {
            title: 'Multi-Vendor Dispatch & Logistics Architecture',
            badge: 'Fulfillment Model',
            body: (
              <>
                <p>
                  Verndly operates as a distributed marketplace platform. Orders placed on the
                  Platform are packaged and dispatched directly by the independent merchant
                  (&quot;Seller&quot;) from their verified local workshop, boutique, or regional
                  fulfillment facility, utilizing verified domestic logistics partners and
                  professional express courier networks.
                </p>
                <p>
                  Verndly provides order status tracking, email status notifications, and Paystack
                  escrow settlement holds so payments are protected while your order is fulfilled
                  and inspected.
                </p>
              </>
            ),
          },
          {
            title: 'Merchant Dispatch Service Level Agreements (SLAs)',
            badge: 'Dispatch Windows',
            body: (
              <>
                <p>
                  Every merchant publishes their operational dispatch turnaround window on their
                  storefront and product detail pages. Merchants are legally obligated to package
                  and hand over items to the designated courier within their declared SLA:
                </p>
                <div className="grid grid-cols-1 gap-3 pt-1 text-xs md:grid-cols-3 md:text-sm">
                  <div className="bg-surface border-border/70 space-y-1.5 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">Same-Day Dispatch</strong>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Express
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Available for ready-to-ship stock on orders placed and payment confirmed
                      before the seller&apos;s daily order cut-off time (typically 1:00 PM). Handed
                      over to courier within 4–6 hours.
                    </p>
                  </div>

                  <div className="bg-surface border-border/70 space-y-1.5 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">Next-Day (24-Hour)</strong>
                      <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold">
                        Standard
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      The platform standard for most catalog items. The merchant packages and
                      dispatches the parcel within twenty-four (24) hours of order confirmation.
                    </p>
                  </div>

                  <div className="bg-surface border-border/70 space-y-1.5 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">2–3 Business Days</strong>
                      <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold">
                        Extended
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Applicable to made-to-order, customized, bulk, or specialized inventory
                      requiring artisan preparation prior to courier handover. Disclosed
                      transparently on the product listing.
                    </p>
                  </div>
                </div>
              </>
            ),
          },
          {
            title: 'Delivery Coverage Zones across Ghana',
            badge: 'Regional Coverage',
            body: (
              <>
                <p>
                  Merchants configure their active service areas based on their logistics network.
                  Products in our marketplace can be filtered by delivery reach across three primary
                  zones:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Same-City / Intra-Metropolitan Express:</strong> Same metropolitan
                    district (e.g. Accra-Tema Metropolis, Kumasi Metro, Takoradi). Shipments are
                    fulfilled via dedicated motorcycle express couriers.{' '}
                    <em>Typical transit duration: 2 to 6 hours after courier handover.</em>
                  </li>
                  <li>
                    <strong>Inter-Regional Transit:</strong> Shipments between regional
                    administrative capitals and major urban hubs across Ghana (e.g. Greater Accra to
                    Ashanti, Western, Eastern, Central, or Northern Regions). Dispatched via
                    regional parcel logistics partners.{' '}
                    <em>Typical transit duration: 24 to 48 hours after courier handover.</em>
                  </li>
                  <li>
                    <strong>Extended Regional Delivery (where the seller ships):</strong> Where a
                    merchant enables inter-regional delivery options, parcels are dispatched via
                    regional logistics partners to supported towns and cities.{' '}
                    <em>Typical transit duration: 2 to 4 business days.</em>
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Transparent Shipping Rates & Fee Calculation',
            badge: 'No Hidden Costs',
            body: (
              <>
                <p>
                  Verndly enforces complete pricing transparency. Delivery rates are calculated and
                  displayed at checkout based on:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs md:text-sm">
                  <li>
                    The physical distance between the merchant&apos;s fulfillment location and your
                    specified delivery address.
                  </li>
                  <li>The volumetric weight and dimensions of the packaged merchandise.</li>
                  <li>
                    The merchant&apos;s active delivery rate schedule (including free shipping
                    promotions where sponsored by the merchant).
                  </li>
                </ul>
                <div className="bg-surface border-border/70 text-muted-foreground rounded-xl border p-4 text-xs leading-relaxed">
                  <strong>Zero Checkout Surcharges:</strong> The delivery charge displayed in your
                  checkout order summary is the complete and final delivery fee. Couriers are
                  strictly prohibited from demanding supplementary &quot;fuel surcharges&quot;,
                  &quot;gate fees&quot;, or unlisted tips upon doorstep arrival.
                </div>
              </>
            ),
          },
          {
            title: 'Free Store Pickup & Direct Collection Option',
            badge: 'Self-Pickup',
            body: (
              <>
                <p>
                  Many verified merchants maintain physical boutiques, showrooms, or workshop
                  collection points. Where available, you may select{' '}
                  <strong>&quot;Store Pickup&quot;</strong> at checkout:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Zero Shipping Cost:</strong> Store pickup is always 100% free of
                    delivery charges.
                  </li>
                  <li>
                    <strong>Pickup Scheduling:</strong> Once your order is packaged, the merchant
                    will transmit their precise physical location, landmark coordinates, and
                    collection hours to you via WhatsApp and email.
                  </li>
                  <li>
                    <strong>Collection Verification:</strong> When collecting your order, present
                    your Order Confirmation Number and a valid government ID. The merchant will
                    record your digital confirmation code to securely release the escrow
                    transaction.
                  </li>
                  <li>
                    <strong>Holding Period:</strong> Pickup orders are held safely at the
                    merchant&apos;s location for up to seven (7) business days. Uncollected orders
                    after seven days may be cancelled and refunded minus an administrative
                    restocking fee.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Real-Time Tracking & Dispatch Telemetry',
            badge: 'Order Visibility',
            body: (
              <>
                <p>
                  From order placement to final doorstep handover, your package journey is tracked
                  through verified status milestones:
                </p>
                <div className="bg-surface border-border/70 space-y-2 rounded-xl border p-4 text-xs md:text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <span>
                      <strong>1. Processing:</strong> Order accepted; merchant is picking,
                      inspecting, and packaging your items.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      <strong>2. Dispatched:</strong> Seller marks the package handed over to the
                      delivery courier.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                    <span>
                      <strong>3. Out for Delivery:</strong> Package is en route to your specified
                      delivery address.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>
                      <strong>4. Delivered:</strong> Package safely handed over; delivery confirmed;
                      3-day inspection window begins.
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  You can track your package in real-time under{' '}
                  <Link href="/orders" className="text-primary underline">
                    My Orders
                  </Link>{' '}
                  or by clicking the tracking link included in your dispatch confirmation email.
                </p>
              </>
            ),
          },
          {
            title: 'Recipient Responsibilities, Inaccurate Addresses & Re-Delivery',
            badge: 'Delivery Accuracy',
            body: (
              <>
                <p>
                  To guarantee successful, on-time delivery, buyers are responsible for maintaining
                  accurate delivery parameters:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Accurate Address Information:</strong> Provide clear street names,
                    prominent landmarks, neighborhood details, and your digital address code
                    (GhanaPost GPS, e.g. GA-123-4567) where available.
                  </li>
                  <li>
                    <strong>Phone Accessibility:</strong> Ensure the contact telephone number
                    provided at checkout is active, reachable, and able to receive voice calls or
                    WhatsApp messages from the delivery courier on the scheduled delivery date.
                  </li>
                  <li>
                    <strong>Delivery Attempts:</strong> Our courier partners make up to two (2)
                    official delivery attempts. If the courier arrives at the declared address and
                    the recipient is unreachable after reasonable waiting, the package is returned
                    to the dispatch hub. Subsequent re-delivery attempts will incur a standard
                    re-dispatch fee payable by the buyer.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Proof of Delivery & Customer Acceptance Protocol',
            badge: 'Custody Handover',
            body: (
              <>
                <p>
                  Delivery is formally finalized when physical custody of the parcel is transferred
                  to the Buyer or an authorized recipient (such as a designated family member,
                  concierge, or office receptionist):
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    The courier records physical proof of delivery via digital waybill signature,
                    recipient verification code, or digital timestamped receipt.
                  </li>
                  <li>
                    Upon verified delivery, the buyer receives an automated delivery confirmation
                    notification.
                  </li>
                  <li>
                    <strong>Inspection Right:</strong> Buyers are strongly encouraged to inspect the
                    outer carton in the presence of the courier. If the exterior packaging is
                    severely crushed, soaked, torn, or shows signs of tampering, note this on the
                    courier waybill and document with photographs immediately.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Delayed, Damaged in Transit, or Lost Packages',
            badge: 'Buyer Safeguards',
            body: (
              <>
                <p>
                  Verndly escrow safeguards protect you against all fulfillment and transit
                  failures:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Transit Delays:</strong> If your package has not arrived past the
                    merchant&apos;s stated delivery window, reach out to our support team at{' '}
                    <a href="mailto:support@verndly.com" className="text-primary underline">
                      support@verndly.com
                    </a>{' '}
                    or WhatsApp +233 53 406 5652 with your Order Number so we can follow up with the
                    seller.
                  </li>
                  <li>
                    <strong>Undelivered Orders:</strong> If an order cannot be delivered or is
                    confirmed undelivered during dispute review, Verndly can reverse the held escrow
                    payment back to your original payment method or coordinate a replacement with
                    the merchant.
                  </li>
                  <li>
                    <strong>In-Transit Damage:</strong> If merchandise arrives broken, cracked, or
                    ruined due to courier mishandling or inadequate merchant packaging, photograph
                    the damaged items and file a claim within three (3) days under our{' '}
                    <Link href="/returns" className="text-primary underline">
                      Returns &amp; Refunds Policy
                    </Link>{' '}
                    for an immediate replacement or full refund.
                  </li>
                </ul>
              </>
            ),
          },
          {
            title: 'Merchant Logistics Conduct & Fulfillment Compliance',
            badge: 'Merchant Standards',
            body: (
              <>
                <p>
                  To maintain reliable fulfillment across the marketplace, merchants are expected to
                  follow these dispatch standards:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs md:text-sm">
                  <li>
                    <strong>Timely Dispatch:</strong> Merchants should package and hand over orders
                    within the dispatch window shown on their storefront and keep buyers informed of
                    any unexpected delay. Repeated unfulfilled orders may result in store review or
                    account suspension.
                  </li>
                  <li>
                    <strong>Accurate Status Updates:</strong> Merchants must only mark an order as
                    &quot;Dispatched&quot; or &quot;Delivered&quot; once the handoff has actually
                    occurred. Misleading status updates may result in escrow holds or account
                    review.
                  </li>
                  <li>
                    <strong>Packaging Quality:</strong> Merchants must package fragile or high-value
                    items securely so they arrive undamaged.
                  </li>
                </ul>
                <div className="bg-surface border-border/70 text-muted-foreground rounded-xl border p-4 text-xs">
                  <strong>Delivery Support &amp; Inquiries:</strong>
                  <br />
                  Have questions regarding an active delivery or need to update your address before
                  dispatch? Email{' '}
                  <a href="mailto:support@verndly.com" className="text-primary underline">
                    support@verndly.com
                  </a>{' '}
                  or WhatsApp +233 53 406 5652 quoting your Order Number.
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
