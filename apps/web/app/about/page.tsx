import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "About Vendly",
  description: "The marketplace for verified young entrepreneurs and small businesses.",
};

export default function AboutPage() {
  return (
    <LegalPage
      eyebrow="Company"
      title="About Vendly"
      description="Vendly is a curated marketplace built so verified young entrepreneurs and small businesses can sell with the same trust, polish, and tools as professional retailers."
      sections={[
        {
          title: "Why we built this",
          body: (
            <p>
              Talented independent sellers were running businesses in Instagram DMs and
              WhatsApp threads — losing sales to lost messages and getting burned by
              scammy buyers. Vendly gives them a real storefront, real payments, and real
              buyer protection, without losing the personal feel of independent commerce.
            </p>
          ),
        },
        {
          title: "What we offer",
          body: (
            <ul className="list-disc pl-5 space-y-1.5">
              <li>A discovery-first marketplace with categories, brands, deals, and search.</li>
              <li>Pro membership for sellers who want featured placement and analytics.</li>
              <li>Native delivery and pickup workflows that match how people actually buy.</li>
              <li>Buyer protection backed by Paystack escrow and our support team.</li>
            </ul>
          ),
        },
        {
          title: "Where we operate",
          body: (
            <p>
              We're live across Ghana and expanding to other West African
              markets through 2026. Want Vendly in your city?{" "}
              <a className="text-primary underline" href="/contact">Get in touch</a>.
            </p>
          ),
        },
        {
          title: "Team",
          body: (
            <p>
              We're a small team of operators, designers, and engineers who've shipped
              software at Anthropic, Paystack, and Flutterwave. We hire in public — see{" "}
              <a className="text-primary underline" href="/contact">contact</a> if you'd like to help.
            </p>
          ),
        },
      ]}
    />
  );
}
