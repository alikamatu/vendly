import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · Verndly",
  description: "The rules of using Verndly as a buyer or a seller.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      description="By using Verndly you agree to these terms. Please read them carefully — they explain your rights and the rules that keep the marketplace fair for everyone."
      updatedAt="May 2026"
      sections={[
        {
          title: "Using Verndly",
          body: (
            <>
              <p>
                You must be at least 16 years old to use Verndly. Sellers must be enrolled
                at, or alumni of, a recognised tertiary institution and pass our verification
                process. You're responsible for keeping your account credentials secure.
              </p>
              <p>
                Don't impersonate anyone, scrape Verndly at scale, or attempt to disrupt the
                service.
              </p>
            </>
          ),
        },
        {
          title: "Buying on Verndly",
          body: (
            <p>
              Orders form a contract between you and the seller. Verndly facilitates the
              transaction, holds funds in escrow where applicable, and provides buyer
              protection within the windows described in our Returns & Refunds policy.
            </p>
          ),
        },
        {
          title: "Selling on Verndly",
          body: (
            <>
              <p>
                Sellers must list authentic items, describe them accurately, and fulfil
                orders within the stated dispatch time. Counterfeit, illegal, or dangerous
                items are prohibited and will be removed without notice.
              </p>
              <p>
                Verndly takes a platform fee on each sale; see the Pricing section of your
                seller dashboard for current rates.
              </p>
            </>
          ),
        },
        {
          title: "Payments & payouts",
          body: (
            <p>
              Payments are processed via Paystack. Seller payouts follow the schedule
              configured by Verndly admins; standard payouts hold for a verification window
              before release. Chargebacks and disputes are handled per Paystack and bank
              policies.
            </p>
          ),
        },
        {
          title: "Prohibited conduct",
          body: (
            <p>
              You agree not to use Verndly to: harass other users, list weapons, drugs, or
              regulated goods; manipulate reviews or ratings; or evade fees by routing
              sales off-platform.
            </p>
          ),
        },
        {
          title: "Termination",
          body: (
            <p>
              We may suspend or terminate accounts that violate these terms. You can close
              your account at any time from your settings; some data may be retained as
              required by law.
            </p>
          ),
        },
        {
          title: "Liability",
          body: (
            <p>
              Verndly is provided "as is". To the extent permitted by law, our liability for
              any claim is limited to the platform fees you've paid us in the 12 months
              before the claim.
            </p>
          ),
        },
        {
          title: "Contact",
          body: (
            <p>
              Questions about these terms? Email{" "}
              <a className="text-primary underline" href="mailto:support@verndly.com">
                support@verndly.com
              </a>{" "}
              or use the <a className="text-primary underline" href="/contact">contact page</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
