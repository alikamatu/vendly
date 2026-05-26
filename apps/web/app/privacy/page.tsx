import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Vendly",
  description: "How Vendly collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="We take your privacy seriously. This policy explains what data we collect, how we use it, and your rights over it."
      updatedAt="May 2026"
      sections={[
        {
          title: "What we collect",
          body: (
            <p>
              We collect information you give us (name, email, phone, business name, store details,
              orders) and limited technical information (IP, device type, referrer) to
              run the platform securely. Payment data is handled by Paystack — we never
              see your full card details.
            </p>
          ),
        },
        {
          title: "How we use it",
          body: (
            <p>
              To process orders, verify sellers, fight fraud, send transactional emails,
              improve product discovery, and (with your consent) send marketing updates.
              We don't sell personal data.
            </p>
          ),
        },
        {
          title: "Cookies",
          body: (
            <p>
              We use essential cookies for sessions and cart state, plus analytics cookies
              to understand aggregate usage. You can clear cookies from your browser at
              any time.
            </p>
          ),
        },
        {
          title: "Third parties",
          body: (
            <p>
              We share data only with providers we need to run the platform: Paystack
              (payments), Cloudinary (media), Resend (email), Supabase (database). Each
              processes data under their own published policies.
            </p>
          ),
        },
        {
          title: "Your rights",
          body: (
            <p>
              You can access, correct, export, or delete your data at any time from your
              account settings. Email{" "}
              <a className="text-primary underline" href="mailto:privacy@vendly.com">
                privacy@vendly.com
              </a>{" "}
              for help.
            </p>
          ),
        },
        {
          title: "Data retention",
          body: (
            <p>
              We retain account data while your account is active, plus the period
              required by tax and accounting laws after closure. Logs are kept up to 90
              days for security investigations.
            </p>
          ),
        },
      ]}
    />
  );
}
