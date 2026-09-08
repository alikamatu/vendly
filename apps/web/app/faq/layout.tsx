import type { Metadata } from "next";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import FaqJsonLd from "@/components/seo/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions (FAQ) — Buyer Protection & Shopping Guide",
  description:
    "Find answers to frequently asked questions about shopping, escrow payments, 7-day buyer protection, returns, delivery, and seller verification on Verndly.",
  path: "/faq",
  keywords: [
    "Verndly FAQ",
    "buyer protection Ghana",
    "Paystack escrow Ghana",
    "how to buy on Verndly",
    "returns policy Ghana",
    "seller verification",
  ],
});

const FAQ_ITEMS = [
  {
    question: "How does Buyer Protection and Escrow work on Verndly?",
    answer:
      "Every purchase on Verndly is safeguarded by escrow settlement. When you pay online via Paystack (Mobile Money, Card, Bank Transfer), your payment is held securely in escrow and is not released to the seller until your order is verified delivered and you have had a full 7-day inspection window.",
  },
  {
    question: "What is Verndly's 7-Day Return and Refund Policy?",
    answer:
      "Buyers have 7 calendar days from delivery confirmation to request a return or replacement if an item arrives damaged, defective, incomplete, or materially different from the seller's listing. Approved claims are refunded directly to the buyer via Paystack gateway reversal.",
  },
  {
    question: "What payment methods are supported on Verndly?",
    answer:
      "Verndly supports all major payment channels via Paystack, including MTN Mobile Money, Vodafone/Telecel Cash, AirtelTigo Money, Visa, Mastercard, and bank transfer. Select sellers also offer Cash on Delivery.",
  },
  {
    question: "How do independent sellers get verified on Verndly?",
    answer:
      "Sellers submit business registration documents, valid government IDs, and store details through the seller onboarding portal. Verndly reviews and verifies documents within 24–48 hours before awarding the Verified Merchant badge.",
  },
  {
    question: "How long does courier delivery take in Ghana?",
    answer:
      "Delivery speeds vary by seller dispatch policies. Many merchants provide same-day or next-day delivery in Greater Accra and Kumasi, and 2–3 business days for regional shipments across Ghana.",
  },
  {
    question: "What is Verndly Pro for sellers?",
    answer:
      "Verndly Pro is a premium merchant subscription granting verified priority placement in category listings, advanced sales analytics, and custom storefront QR codes for promotional packaging.",
  },
];

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]}
      />
      <FaqJsonLd items={FAQ_ITEMS} />
      {children}
    </>
  );
}
