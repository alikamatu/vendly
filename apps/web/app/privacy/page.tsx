import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Verndly",
  description:
    "Comprehensive privacy notice detailing how Verndly collects, protects, processes, and safeguards personal and commercial data across the marketplace.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Data Protection & Privacy"
      title="Privacy Policy & Data Governance Notice"
      description="Verndly is committed to protecting the privacy, confidentiality, and security of our buyers, merchants, and visitors. This comprehensive privacy notice explains our data governance practices, statutory compliance with Data Protection legislation, and your legal rights regarding your personal information."
      updatedAt="September 2026"
      sections={[
        {
          title: "Data Controller Notice & Scope of Policy",
          badge: "Regulatory Scope",
          body: (
            <>
              <p>
                This Privacy Policy is issued by Verndly Commerce &amp; Financial Services Limited (&quot;Verndly&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
                as the designated Data Controller under the Ghana Data Protection Act, 2012 (Act 843) and aligned with international
                data protection standards, including the General Data Protection Regulation (GDPR) principles where applicable.
              </p>
              <p>
                This notice governs the collection, processing, storage, sharing, and protection of personal data across all Verndly
                digital touchpoints, including our consumer website (verndly.com), storefront directories, merchant management portals,
                checkout interfaces, transactional communication channels, and developer APIs (collectively, the &quot;Platform&quot;).
              </p>
              <p>
                By accessing or using the Platform, registering an account, purchasing goods, or operating a merchant storefront, you
                acknowledge that your personal data will be processed strictly in accordance with the terms set forth herein.
              </p>
            </>
          ),
        },
        {
          title: "Categories of Personal Data We Collect",
          badge: "Information Gathered",
          body: (
            <>
              <p>
                We collect personal information to provide, secure, and personalize our multi-vendor commerce services. The categories of
                data we gather depend on your interaction with the Platform:
              </p>
              <div className="space-y-4 text-xs md:text-sm">
                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <h3 className="font-semibold text-foreground">1. Information Provided Directly by Buyers:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Full legal name, billing address, and physical delivery address (including neighborhood, city, and digital address coordinates).</li>
                    <li>Contact email address and active mobile telephone number / WhatsApp contact for dispatch logistics and notifications.</li>
                    <li>Order specifications, delivery instructions, recipient notes, and return requests.</li>
                    <li>Account authentication credentials, including username and cryptographically salted password hashes.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <h3 className="font-semibold text-foreground">2. Information Provided by Merchants (Sellers):</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Store owner legal name, enterprise trade name, business registration certificate details, and verified store bio.</li>
                    <li>Government-issued identification credentials (Ghana Card, National Passport, or Voter ID number) for statutory AML/KYC verification.</li>
                    <li>Settlement disbursement accounts: commercial bank name, bank branch code, account number, and/or registered Mobile Money merchant wallet details (MTN, Telecel, AT).</li>
                    <li>Store operating hours, pickup location coordinates, delivery policy disclosures, and official social media channel links.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <h3 className="font-semibold text-foreground">3. Payment &amp; Financial Security Information:</h3>
                  <p className="text-muted-foreground">
                    All payment card transactions are processed directly by our PCI-DSS Level 1 certified payment gateway partner, Paystack Payments Limited. <strong>Verndly never stores, transmits, or has access to your full credit/debit card numbers, CVVs, or mobile banking PINs.</strong> We retain only tokenized gateway payment identifiers, payment references, transaction statuses, and masked account endings (e.g. &quot;Visa ending in •••• 4242&quot;) for accounting, reconciliation, and dispute audits.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5">
                  <h3 className="font-semibold text-foreground">4. Automatically Collected Technical &amp; Usage Data:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Internet Protocol (IP) address, approximate geographic location, internet service provider (ISP), and device fingerprints.</li>
                    <li>Browser user agent, browser language, operating system version, and screen resolution.</li>
                    <li>Platform interaction telemetry: pages viewed, items searched, categories explored, clickstream patterns, and referring URLs.</li>
                  </ul>
                </div>
              </div>
            </>
          ),
        },
        {
          title: "Lawful Bases for Processing Personal Data",
          badge: "Legal Compliance",
          body: (
            <>
              <p>
                Under statutory data protection law, Verndly only collects and processes personal information where we have an established,
                lawful basis to do so:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Performance of a Contract:</strong> Processing necessary to fulfill our contractual commitments to you, including creating user accounts, processing orders, executing escrow payments, facilitating courier dispatch, and paying out merchant earnings.
                </li>
                <li>
                  <strong>Compliance with Legal &amp; Regulatory Obligations:</strong> Processing required to comply with statutory taxation reporting (GRA compliance), Anti-Money Laundering (AML) / Know Your Customer (KYC) guidelines under the Bank of Ghana payment systems framework, and lawful court subpoenas.
                </li>
                <li>
                  <strong>Legitimate Business Interests:</strong> Processing necessary for our legitimate interests in securing the Platform against cyber threats, preventing payment fraud, auditing 4% platform fees, maintaining anti-circumvention controls, enhancing catalog search, and conducting platform telemetry.
                </li>
                <li>
                  <strong>User Consent:</strong> In specific cases where you have granted explicit consent, such as opting into our merchant newsletter, marketing communications, or promotional WhatsApp announcements. You have the statutory right to withdraw consent at any time.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "How We Use Your Personal Information",
          badge: "Operational Usage",
          body: (
            <>
              <p>
                Verndly utilizes personal data strictly for legitimate operational, security, and commercial purposes, including:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Order Management &amp; Fulfillment:</strong> Transmitting necessary shipping manifests to merchants and courier services to enable timely doorstep delivery.
                </li>
                <li>
                  <strong>Payment Verification &amp; Escrow Holding:</strong> Authenticating transactions, managing segregated escrow settlement holding accounts, and executing net disbursements.
                </li>
                <li>
                  <strong>Buyer Protection &amp; Dispute Arbitration:</strong> Investigating damaged, missing, or misdescribed product claims under our <Link href="/returns" className="text-primary underline">Returns &amp; Refunds Policy</Link>.
                </li>
                <li>
                  <strong>Merchant Governance &amp; Security:</strong> Verifying merchant identity credentials, preventing store spoofing, identifying fake reviews, and blocking fraudulent or bot traffic.
                </li>
                <li>
                  <strong>Transactional Communications:</strong> Transmitting automated order confirmations, official payout receipts, dispatch tracking alerts, password resets, and critical legal policy updates.
                </li>
                <li>
                  <strong>Platform Optimization:</strong> Analyzing aggregate catalog demand, delivery turnaround speeds, and user navigation patterns to optimize marketplace performance.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Data Sharing, Disclosure & Authorized Sub-Processors",
          badge: "Third-Party Disclosures",
          body: (
            <>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground leading-relaxed">
                <strong>Our Strict Non-Monetization Commitment:</strong> Verndly does NOT sell, rent, lease, or monetize your personal data or customer transaction records to third-party data brokers, marketing agencies, or external advertisers.
              </div>
              <p>
                We share personal data solely with the following authorized entities strictly as necessary to execute marketplace operations:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Marketplace Counterparties:</strong> When a Buyer orders from an independent Seller, we transmit the Buyer&apos;s customer name, delivery address, and contact phone number to that specific merchant and their assigned courier strictly to facilitate packaging and physical delivery. Sellers are contractually prohibited from using buyer information for unsolicited private marketing.
                </li>
                <li>
                  <strong>Financial &amp; Gateway Partners:</strong> Paystack Payments Limited processes card and Mobile Money payments, maintains verified merchant subaccounts, and executes escrow settlements in accordance with their licensed regulatory duties.
                </li>
                <li>
                  <strong>Infrastructure &amp; Technology Providers:</strong> We utilize trusted, enterprise-grade cloud service providers bound by strict Data Processing Agreements (DPAs):
                  <ul className="list-circle pl-5 mt-1 space-y-1 text-muted-foreground">
                    <li><em>Resend Technologies Inc.</em> — Secure transactional email delivery infrastructure.</li>
                    <li><em>Cloudinary Inc.</em> — Encrypted media and product photograph hosting.</li>
                    <li><em>Supabase &amp; Cloud Database Hosts</em> — ISO-27001 and SOC-2 compliant managed database infrastructure.</li>
                  </ul>
                </li>
                <li>
                  <strong>Legal &amp; Law Enforcement Authorities:</strong> We may disclose personal data if required to do so by a valid court order, warrant, judicial subpoena, or statutory government directive, or when necessary to investigate financial fraud, protect consumer safety, or enforce our <Link href="/terms" className="text-primary underline">Terms of Service</Link>.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Cookies, Web Storage & Tracking Technologies",
          badge: "Browser Telemetry",
          body: (
            <>
              <p>
                Verndly utilizes cookies, session tokens, and local web storage to provide a seamless, secure user experience:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Strictly Essential Cookies:</strong> Fundamental to platform functionality. They manage authenticated user sessions, maintain shopping cart contents across page loads, enforce Cross-Site Request Forgery (CSRF) security protection, and support secure checkout routing. These cannot be disabled without breaking platform functionality.
                </li>
                <li>
                  <strong>Functional &amp; Preference Cookies:</strong> Remember your interface preferences, such as light/dark mode selection, recently viewed items, and preferred delivery regions.
                </li>
                <li>
                  <strong>Performance &amp; Analytics Cookies:</strong> Gather anonymized, aggregated telemetry on page load speeds, error rates, and navigation paths to help our engineers optimize system performance.
                </li>
              </ul>
              <p>
                You may adjust your web browser settings to block or notify you about cookies. However, disabling essential cookies will prevent you from logging in, maintaining a shopping cart, or completing purchases on the Platform.
              </p>
            </>
          ),
        },
        {
          title: "International Data Transfers & Cloud Infrastructure",
          badge: "Data Sovereignty",
          body: (
            <>
              <p>
                While Verndly primarily serves merchants and consumers in Ghana and West Africa, our technical infrastructure and cloud sub-processors operate high-availability data centers distributed globally.
              </p>
              <p>
                Where personal information is transferred across international borders, Verndly ensures that appropriate statutory safeguards are enforced in compliance with the Data Protection Act (Act 843), including Standard Contractual Clauses (SCCs), strict data encryption in transit and at rest, and vetting vendor compliance with ISO/IEC 27001, SOC-2, and GDPR standards.
              </p>
            </>
          ),
        },
        {
          title: "Cryptographic Security & Data Protection Measures",
          badge: "Information Security",
          body: (
            <>
              <p>
                Verndly implements multi-tiered, industry-standard physical, electronic, and procedural safeguards to protect your personal information against unauthorized access, destruction, loss, alteration, or disclosure:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Encryption in Transit:</strong> All HTTP communications with the Platform are strictly enforced via Transport Layer Security (TLS 1.3 / HTTPS) with modern cryptographic cipher suites.
                </li>
                <li>
                  <strong>Encryption at Rest:</strong> Sensitive customer databases, identity verification documents, and audit trails are encrypted at rest using industry-standard Advanced Encryption Standard (AES-256).
                </li>
                <li>
                  <strong>Credential Hashing:</strong> User account passwords are never stored in plain text; they are hashed using irreversible, salted cryptographic hashing algorithms (bcrypt/Argon2).
                </li>
                <li>
                  <strong>Role-Based Access Control (RBAC):</strong> Internal access to user data is strictly restricted to authorized administrative personnel on a verified need-to-know basis, protected by multi-factor authentication (MFA) and immutable audit logging.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Data Retention & Disposal Schedule",
          badge: "Lifecycle Management",
          body: (
            <>
              <p>
                We retain personal data only for as long as necessary to satisfy the commercial, legal, and operational purposes outlined in this policy:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm">
                <li>
                  <strong>Active Accounts:</strong> User profile information, storefront details, and product catalogs are maintained for the active lifecycle of your registered account.
                </li>
                <li>
                  <strong>Financial &amp; Transaction Records:</strong> In accordance with statutory tax legislation and corporate auditing standards, records of completed orders, payment references, tax invoices, and payout receipts are securely retained for seven (7) years following transaction execution.
                </li>
                <li>
                  <strong>Security &amp; Audit Logs:</strong> Server telemetry, IP access logs, and audit logs are retained for ninety (90) days for forensic analysis and intrusion detection, after which they are automatically purged.
                </li>
                <li>
                  <strong>Account Deletion:</strong> When an account is closed upon user request, non-financial personal data is permanently deleted or anonymized within thirty (30) business days, except where retention is legally mandated.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Your Statutory Rights as a Data Subject",
          badge: "Your Legal Rights",
          body: (
            <>
              <p>
                Under applicable Data Protection legislation, you possess comprehensive statutory rights regarding your personal information. You may exercise these rights at any time through your Account Settings or by contacting our Data Protection Officer:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm">
                <li>
                  <strong>Right to Access (Subject Access Request):</strong> You have the right to request a formal copy of the personal information Verndly holds about you, including transaction histories and verification files.
                </li>
                <li>
                  <strong>Right to Rectification:</strong> You may update or correct inaccurate, incomplete, or outdated personal information directly through your dashboard or request administrative correction.
                </li>
                <li>
                  <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You have the right to request the permanent deletion of your personal data, provided there are no active orders, pending escrow disputes, or statutory tax retention mandates requiring continued preservation.
                </li>
                <li>
                  <strong>Right to Restrict or Object to Processing:</strong> You may object to the processing of your data for direct marketing purposes, promotional analytics, or automated profiling.
                </li>
                <li>
                  <strong>Right to Data Portability:</strong> You are entitled to receive your personal data in a structured, commonly used, and machine-readable electronic format (JSON or CSV).
                </li>
                <li>
                  <strong>Right to Lodge a Regulatory Complaint:</strong> You have the right to file a formal complaint with the Data Protection Commission (DPC) of Ghana if you believe Verndly has processed your personal data in violation of statutory law.
                </li>
              </ul>
              <p>
                To submit a formal data rights request, please email our Data Protection Office at{" "}
                <a href="mailto:privacy@verndly.com" className="text-primary underline">privacy@verndly.com</a>. We verify your identity before processing and respond to all requests within thirty (30) calendar days.
              </p>
            </>
          ),
        },
        {
          title: "Protection of Children's Privacy",
          badge: "Age Restrictions",
          body: (
            <>
              <p>
                Verndly is a commercial marketplace designed for adult consumers, young entrepreneurs, and registered business owners. We do not knowingly solicit, collect, or process personal data from children under the age of 16 without verified parental or legal guardian authorization.
              </p>
              <p>
                If we become aware that personal information relating to a child under 16 has been collected without verified parental consent, we will take immediate steps to suspend the associated account and permanently erase the data from our active storage infrastructure. Parents or guardians who believe a child has provided us with personal data may contact us immediately at{" "}
                <a href="mailto:privacy@verndly.com" className="text-primary underline">privacy@verndly.com</a>.
              </p>
            </>
          ),
        },
        {
          title: "Policy Amendments & Data Protection Contact",
          badge: "Governance & Review",
          body: (
            <>
              <p>
                Verndly reviews and updates this Privacy Policy periodically to reflect technological developments, legislative amendments, and platform updates. When material revisions occur, we will update the &quot;Effective Date&quot; at the top of this document and provide prominent electronic notice via email or your account dashboard at least seven (7) days prior to enforcement.
              </p>
              <p>
                Your continued use of the Platform after the effective date of an amended policy constitutes your understanding and acknowledgment of the revised terms.
              </p>
              <div className="p-4 rounded-xl bg-surface border border-border/70 text-xs text-muted-foreground">
                <strong>Data Protection Officer &amp; Compliance Inquiries:</strong><br />
                Verndly Commerce &amp; Financial Services Limited<br />
                Attention: Legal &amp; Data Protection Office<br />
                Accra, Greater Accra Region, Ghana<br />
                Direct Privacy Email: <a href="mailto:privacy@verndly.com" className="text-primary underline">privacy@verndly.com</a><br />
                General Inquiries: <a href="mailto:support@verndly.com" className="text-primary underline">support@verndly.com</a> | WhatsApp: +233 53 406 5652
              </div>
            </>
          ),
        },
      ]}
    />
  );
}

