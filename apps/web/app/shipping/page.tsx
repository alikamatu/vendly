import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Shipping & Delivery · Vendly",
  description: "How orders move from sellers to buyers on Vendly.",
};

export default function ShippingPage() {
  return (
    <LegalPage
      eyebrow="Logistics"
      title="Shipping & Delivery"
      description="Every Vendly seller sets their own delivery zone and dispatch time. Here's what to expect, and how the typical journey works."
      updatedAt="May 2026"
      sections={[
        {
          title: "Delivery zones",
          body: (
            <p>
              Sellers list a service area: <strong>Same city only</strong>,{" "}
              <strong>Nearby states</strong>, or <strong>Nationwide</strong>. You'll see
              the zone on every product page; the marketplace search lets you filter by it.
            </p>
          ),
        },
        {
          title: "Dispatch time",
          body: (
            <p>
              Each seller publishes their average dispatch window — typically{" "}
              <strong>Same day</strong>, <strong>Next day</strong>, or{" "}
              <strong>2–3 days</strong>. Orders are confirmed by email; you can also
              track them under <a className="text-primary underline" href="/orders">My orders</a>.
            </p>
          ),
        },
        {
          title: "Pickup",
          body: (
            <p>
              Many sellers offer free in-person pickup at their local pickup location. Choose
              <em> Pickup</em> at checkout and the seller will share the location and a
              meet-up window via WhatsApp.
            </p>
          ),
        },
        {
          title: "Tracking & contact",
          body: (
            <p>
              Once dispatched, sellers update order status through their dashboard. You'll
              get real-time email updates and can message the seller directly via the
              "Contact" button on their storefront.
            </p>
          ),
        },
      ]}
    />
  );
}
