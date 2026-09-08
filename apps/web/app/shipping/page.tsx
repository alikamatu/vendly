import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy · Verndly",
  description:
    "Official logistics guidelines, merchant dispatch SLAs, nationwide delivery zones, real-time tracking, and lost parcel protection on Verndly.",
};

export default function ShippingPage() {
  return (
    <LegalPage
      eyebrow="Logistics & Delivery Standards"
      title="Shipping, Dispatch & Delivery Policy"
      description="Verndly connects you with verified independent merchants across Ghana. This policy explains our dispatch standards, delivery coverage zones, tracking protocols, courier handover procedures, and our commitment to prompt, safe doorstep delivery."
      updatedAt="September 2026"
      sections={[
        {
          title: "Multi-Vendor Dispatch & Logistics Architecture",
          badge: "Fulfillment Model",
          body: (
            <>
              <p>
                Verndly operates as a distributed marketplace platform. Orders placed on the Platform are packaged and dispatched
                directly by the independent merchant (&quot;Seller&quot;) from their verified local workshop, boutique, or regional fulfillment
                facility, utilizing verified domestic logistics partners and professional express courier networks.
              </p>
              <p>
                Verndly provides the central technological tracking framework, automated delivery notifications, courier waybill
                monitoring, and escrow settlement holds that ensure packages are safely delivered before merchant payouts are released.
              </p>
            </>
          ),
        },
        {
          title: "Merchant Dispatch Service Level Agreements (SLAs)",
          badge: "Dispatch Windows",
          body: (
            <>
              <p>
                Every merchant publishes their operational dispatch turnaround window on their storefront and product detail pages.
                Merchants are legally obligated to package and hand over items to the designated courier within their declared SLA:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-sm pt-1">
                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-foreground">Same-Day Dispatch</strong>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">Express</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Available for ready-to-ship stock on orders placed and payment confirmed before the seller&apos;s daily order cut-off time (typically 1:00 PM). Handed over to courier within 4–6 hours.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-foreground">Next-Day (24-Hour)</strong>
                    <span className="text-[10px] font-mono text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">Standard</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    The platform standard for most catalog items. The merchant packages and dispatches the parcel within twenty-four (24) hours of order confirmation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-foreground">2–3 Business Days</strong>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">Extended</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Applicable to made-to-order, customized, bulk, or specialized inventory requiring artisan preparation prior to courier handover. Disclosed transparently on the product listing.
                  </p>
                </div>
              </div>
            </>
          ),
        },
        {
          title: "Delivery Coverage Zones across Ghana",
          badge: "Regional Coverage",
          body: (
            <>
              <p>
                Merchants configure their active service areas based on their logistics network. Products in our marketplace
                can be filtered by delivery reach across three primary zones:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Same-City / Intra-Metropolitan Express:</strong> Same metropolitan district (e.g. Accra-Tema Metropolis, Kumasi Metro, Takoradi). Shipments are fulfilled via dedicated motorcycle express couriers. <em>Typical transit duration: 2 to 6 hours after courier handover.</em>
                </li>
                <li>
                  <strong>Inter-Regional Transit:</strong> Shipments between regional administrative capitals and major urban hubs across Ghana (e.g. Greater Accra to Ashanti, Western, Eastern, Central, or Northern Regions). Dispatched via regional parcel logistics partners. <em>Typical transit duration: 24 to 48 hours after courier handover.</em>
                </li>
                <li>
                  <strong>Nationwide &amp; Remote Districts:</strong> Complete coverage extending to district capitals and remote towns across all 16 regions. Dispatched via intercity commercial transport hubs and express parcel networks. <em>Typical transit duration: 2 to 4 business days.</em>
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Transparent Shipping Rates & Fee Calculation",
          badge: "No Hidden Costs",
          body: (
            <>
              <p>
                Verndly enforces complete pricing transparency. Delivery rates are calculated and displayed at checkout based on:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li>The physical distance between the merchant&apos;s fulfillment location and your specified delivery address.</li>
                <li>The volumetric weight and dimensions of the packaged merchandise.</li>
                <li>The merchant&apos;s active delivery rate schedule (including free shipping promotions where sponsored by the merchant).</li>
              </ul>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed">
                <strong>Zero Checkout Surcharges:</strong> The delivery charge displayed in your checkout order summary is the complete and final delivery fee. Couriers are strictly prohibited from demanding supplementary &quot;fuel surcharges&quot;, &quot;gate fees&quot;, or unlisted tips upon doorstep arrival.
              </div>
            </>
          ),
        },
        {
          title: "Free Store Pickup & Direct Collection Option",
          badge: "Self-Pickup",
          body: (
            <>
              <p>
                Many verified merchants maintain physical boutiques, showrooms, or workshop collection points. Where available,
                you may select <strong>&quot;Store Pickup&quot;</strong> at checkout:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Zero Shipping Cost:</strong> Store pickup is always 100% free of delivery charges.
                </li>
                <li>
                  <strong>Pickup Scheduling:</strong> Once your order is packaged, the merchant will transmit their precise physical location, landmark coordinates, and collection hours to you via WhatsApp and email.
                </li>
                <li>
                  <strong>Collection Verification:</strong> When collecting your order, present your Order Confirmation Number and a valid government ID. The merchant will record your digital confirmation code to securely release the escrow transaction.
                </li>
                <li>
                  <strong>Holding Period:</strong> Pickup orders are held safely at the merchant&apos;s location for up to seven (7) business days. Uncollected orders after seven days may be cancelled and refunded minus an administrative restocking fee.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Real-Time Tracking & Dispatch Telemetry",
          badge: "Order Visibility",
          body: (
            <>
              <p>
                From order placement to final doorstep handover, your package journey is tracked through verified status milestones:
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-2 text-xs md:text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span><strong>1. Processing:</strong> Order accepted; merchant is picking, inspecting, and packaging your items.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>2. Dispatched:</strong> Package handed over to delivery courier; waybill reference generated.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span><strong>3. Out for Delivery:</strong> Courier is en route to your specific delivery address; rider contact shared.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>4. Delivered:</strong> Package safely handed over; delivery confirmed; 7-day inspection window begins.</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can track your package in real-time under <Link href="/orders" className="text-primary underline">My Orders</Link> or by clicking the tracking link included in your dispatch confirmation email.
              </p>
            </>
          ),
        },
        {
          title: "Recipient Responsibilities, Inaccurate Addresses & Re-Delivery",
          badge: "Delivery Accuracy",
          body: (
            <>
              <p>
                To guarantee successful, on-time delivery, buyers are responsible for maintaining accurate delivery parameters:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Accurate Address Information:</strong> Provide clear street names, prominent landmarks, neighborhood details, and your digital address code (GhanaPost GPS, e.g. GA-123-4567) where available.
                </li>
                <li>
                  <strong>Phone Accessibility:</strong> Ensure the contact telephone number provided at checkout is active, reachable, and able to receive voice calls or WhatsApp messages from the delivery courier on the scheduled delivery date.
                </li>
                <li>
                  <strong>Delivery Attempts:</strong> Our courier partners make up to two (2) official delivery attempts. If the courier arrives at the declared address and the recipient is unreachable after reasonable waiting, the package is returned to the dispatch hub. Subsequent re-delivery attempts will incur a standard re-dispatch fee payable by the buyer.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Proof of Delivery & Customer Acceptance Protocol",
          badge: "Custody Handover",
          body: (
            <>
              <p>
                Delivery is formally finalized when physical custody of the parcel is transferred to the Buyer or an authorized
                recipient (such as a designated family member, concierge, or office receptionist):
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>The courier records physical proof of delivery via digital waybill signature, recipient verification code, or digital timestamped receipt.</li>
                <li>Upon verified delivery, the buyer receives an automated delivery confirmation notification.</li>
                <li><strong>Inspection Right:</strong> Buyers are strongly encouraged to inspect the outer carton in the presence of the courier. If the exterior packaging is severely crushed, soaked, torn, or shows signs of tampering, note this on the courier waybill and document with photographs immediately.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Delayed, Damaged in Transit, or Lost Packages",
          badge: "Buyer Safeguards",
          body: (
            <>
              <p>
                Verndly escrow safeguards protect you against all fulfillment and transit failures:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Transit Delays:</strong> If your package has not arrived within forty-eight (48) hours beyond the merchant&apos;s estimated delivery window, notify our Logistics Desk at <a href="mailto:shipping@verndly.com" className="text-primary underline">shipping@verndly.com</a>. We will initiate an immediate tracer with the courier.
                </li>
                <li>
                  <strong>Lost Parcels:</strong> If a courier investigation confirms that a parcel has been lost in transit or untraceable for more than five (5) business days, Verndly will immediately issue a <strong>100% full refund</strong> (including all shipping fees) from escrow back to your original payment method, or coordinate an immediate free replacement dispatch from the merchant.
                </li>
                <li>
                  <strong>In-Transit Damage:</strong> If merchandise arrives broken, cracked, or ruined due to courier mishandling or inadequate merchant packaging, photograph the damaged items and file a claim within seven (7) days under our <Link href="/returns" className="text-primary underline">Returns &amp; Refunds Policy</Link> for an immediate replacement or full refund.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Merchant Logistics Conduct & Fulfillment Compliance",
          badge: "Merchant Standards",
          body: (
            <>
              <p>
                To maintain high fulfillment standards across the marketplace, merchants are audited on their logistics performance:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Late Dispatch Penalties:</strong> Merchants with chronic dispatch delays exceeding their stated SLA by more than 48 hours face listing de-ranking and temporary suspension of express seller badges.
                </li>
                <li>
                  <strong>False Tracking Dispatches:</strong> Marking an order as &quot;Dispatched&quot; before the package has physically been handed over to the courier constitutes deceptive commercial conduct and results in immediate financial penalties.
                </li>
                <li>
                  <strong>Packaging Quality:</strong> Merchants must use bubble wrap, corrugated cardboard, and weather-resistant outer packaging for fragile or high-value merchandise.
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground">
                <strong>Logistics Support &amp; Delivery Inquiries:</strong><br />
                Have questions regarding an active delivery or need to update your address before dispatch? Contact our Delivery Operations Desk at{" "}
                <a href="mailto:shipping@verndly.com" className="text-primary underline">shipping@verndly.com</a> or WhatsApp our logistics hotline at +233 53 406 5652 quoting your Order Number.
              </div>
            </>
          ),
        },
      ]}
    />
  );
}

