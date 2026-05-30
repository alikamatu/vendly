import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Returns & Refunds · Verndly",
  description: "How returns, refunds, and disputes work on Verndly.",
};

export default function ReturnsPage() {
  return (
    <LegalPage
      eyebrow="Buyer protection"
      title="Returns & Refunds"
      description="If something isn't right, we've got you. Here's how Verndly's buyer protection works, and how to start a return."
      updatedAt="May 2026"
      sections={[
        {
          title: "Eligibility",
          body: (
            <p>
              You may request a return within <strong>7 days</strong> of delivery if the
              item is damaged, materially different from the description, or doesn't
              work as advertised. Hygiene items, customised products, and digital goods
              are non-returnable unless faulty.
            </p>
          ),
        },
        {
          title: "How to request a return",
          body: (
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Open the order from <a className="text-primary underline" href="/orders">My orders</a>.</li>
              <li>Tap <strong>Request return</strong> and describe the issue (photos help).</li>
              <li>The seller has 48 hours to respond. If unresolved, escalate to Verndly support.</li>
            </ol>
          ),
        },
        {
          title: "Refunds",
          body: (
            <p>
              Approved refunds are processed via Paystack to the original payment method
              within <strong>5–10 business days</strong>. Pay-on-delivery refunds are
              handled directly by the seller; Verndly supervises disputes.
            </p>
          ),
        },
        {
          title: "Disputes",
          body: (
            <p>
              If you can't reach an agreement with the seller, Verndly mediates and may
              issue a buyer-protection refund from escrow. Final decisions are based on
              the evidence both parties provide.
            </p>
          ),
        },
      ]}
    />
  );
}
