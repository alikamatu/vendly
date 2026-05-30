#!/usr/bin/env node
/* eslint-disable */
// Builds Verndly_Official_Documentation.docx for the marketing team.
// Conservative docx-js usage — no header/footer/fields/multi-section.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType,
} = require('docx');

const INK = '0A0A0A';
const SUBTLE = '525252';
const LINE = 'D4D4D4';
const ACCENT = 'E11D48';

const PAGE = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};
const CONTENT_W = 9360;

// ─── helpers ───────────────────────────────────────────────────────────────
const run = (text, opts = {}) => new TextRun({ text, font: 'Arial', ...opts });
const para = (text, opts = {}) =>
  new Paragraph({
    children: [run(text)],
    spacing: { after: 140 },
    ...opts,
  });
const blank = () => new Paragraph({ children: [run('')] });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [run(text, { bold: true, size: 36, color: INK })],
    spacing: { before: 400, after: 220 },
    pageBreakBefore: true,
  });
const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [run(text, { bold: true, size: 28, color: INK })],
    spacing: { before: 280, after: 140 },
  });
const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [run(text, { bold: true, size: 24, color: INK })],
    spacing: { before: 200, after: 100 },
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [run(text)],
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 80 },
    children: [run(text)],
  });

// Quote / callout — single-cell table with subtle accent fill
const callout = (label, body) => {
  const border = { style: BorderStyle.SINGLE, size: 4, color: ACCENT };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            width: { size: CONTENT_W, type: WidthType.DXA },
            shading: { fill: 'FFF1F2', type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                spacing: { after: 80 },
                children: [run(label.toUpperCase(), { bold: true, size: 18, color: ACCENT })],
              }),
              new Paragraph({
                children: [run(body, { size: 22, color: INK })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// Two-column key/value table for spec blocks
const specTable = (rows) => {
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: rows.map(([k, v], i) =>
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 2800, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [new Paragraph({ children: [run(k, { bold: true, size: 20, color: INK })] })],
          }),
          new TableCell({
            borders,
            width: { size: 6560, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [new Paragraph({ children: [run(v, { size: 20, color: INK })] })],
          }),
        ],
      })
    ),
  });
};

// ─── content ───────────────────────────────────────────────────────────────
const children = [];

// COVER — page 1 (no pageBreakBefore on first heading)
children.push(blank(), blank(), blank(), blank(), blank());
children.push(new Paragraph({
  alignment: AlignmentType.LEFT,
  children: [run('VERNDLY', { bold: true, size: 96, color: INK })],
  spacing: { after: 120 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.LEFT,
  children: [run('Official Documentation', { size: 36, color: ACCENT })],
  spacing: { after: 200 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.LEFT,
  children: [run('Marketing & Stakeholder Briefing', { size: 26, color: SUBTLE })],
  spacing: { after: 1200 },
}));
children.push(specTable([
  ['Prepared by', 'Verndly Product Team'],
  ['Version', '1.0 · May 2026'],
  ['Audience', 'Marketing, partnerships, growth, and exec stakeholders'],
  ['Confidentiality', 'Internal — share with explicit approval only'],
]));

// TABLE OF CONTENTS — page 2
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [run('Table of Contents', { bold: true, size: 36, color: INK })],
  spacing: { before: 0, after: 280 },
  pageBreakBefore: true,
}));
children.push(para('Use this table to navigate the document. Section numbers double as talking-point references when briefing partners.'));
[
  '1.  Executive Summary',
  '2.  Introduction',
  '3.  Product Overview',
  '4.  Problem Statement',
  '5.  Objectives & Success Metrics',
  '6.  Target Audience',
  '7.  Value Proposition',
  '8.  Core Features',
  '9.  How It Works',
  '10. Technology & Architecture',
  '11. Security, Trust & Compliance',
  '12. Payments & Payouts',
  '13. Business Model',
  '14. Brand Guidelines',
  '15. Roadmap (next 12 months)',
  '16. Talking Points for Marketing',
  '17. FAQ',
  '18. Glossary',
  '19. Appendix & Contact',
  '20. Go-Live Budget',
].forEach((line) => {
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [run(line, { size: 22 })],
  }));
});

// 1. EXECUTIVE SUMMARY
children.push(h1('1. Executive Summary'));
children.push(para('Verndly is a Ghana-built marketplace that turns small social-commerce sellers into credible, verified online businesses. Buyers get safer purchases and faster delivery; sellers get a storefront, payment rails, and a growth toolkit they cannot easily assemble on their own.'));
children.push(para('The platform is live, monetised through transaction fees and a paid "Pro" seller subscription, and built on a modern, audited stack (Next.js, NestJS, Paystack, Cloudinary, Resend, Arkesel). It launched in West Africa with a focus on Ghana and is designed to extend across the region.'));
children.push(callout('In one sentence', 'Verndly is the trust layer that lets Ghana\'s informal sellers operate like real e-commerce brands — verified, payable, trackable, and shareable.'));

// 2. INTRODUCTION
children.push(h1('2. Introduction'));
children.push(para('This document is the canonical reference for explaining Verndly to anyone outside the engineering team: marketing partners, agencies, press, investors, vendors, and new hires. It is intentionally written in plain language. Where technical detail is unavoidable, it is set aside in dedicated sections so you can skip past it without losing the thread.'));
children.push(h3('How to use this document'));
children.push(bullet('If you have five minutes, read sections 1, 3, and 7.'));
children.push(bullet('If you are writing copy or scripts, lean on sections 7, 8, 14, and 16.'));
children.push(bullet('If you are briefing a partner or press, sections 4, 5, 9, and 13 will carry the conversation.'));
children.push(bullet('If you are answering questions on a sales call, sections 8, 11, 12, and 17 cover most of them.'));
children.push(h3('What this document is not'));
children.push(para('This is not the engineering spec, not the legal terms of service, and not a sales deck. Engineering details live in the repo (README and API_REFERENCE). Legal terms live on verndly.com/terms. The sales deck lives in the marketing drive.'));

// 3. PRODUCT OVERVIEW
children.push(h1('3. Product Overview'));
children.push(para('Verndly is a two-sided marketplace. Buyers browse and check out; sellers list and fulfil. A lightweight admin surface keeps the platform clean, safe, and accountable.'));
children.push(h2('3.1 What buyers see'));
children.push(bullet('A clean storefront with curated products, real photos, and verified sellers.'));
children.push(bullet('A shopping cart, secure Paystack checkout, and order tracking from "paid" to "delivered".'));
children.push(bullet('Reviews, ratings, and return requests — the same instincts buyers have been trained on by global marketplaces, adapted for local context.'));
children.push(h2('3.2 What sellers get'));
children.push(bullet('A dashboard to list products (with up to three photos and a short video), set prices, manage stock, and watch orders come in.'));
children.push(bullet('Automatic payouts: when a customer pays, Verndly takes its fee, deposits the rest into the seller\'s bank or mobile money account, and emails them a receipt.'));
children.push(bullet('A verified seller badge once they pass identity + proof-of-sales checks. Sellers without it cannot publish.'));
children.push(h2('3.3 What admins do'));
children.push(bullet('Approve or reject seller verifications.'));
children.push(bullet('Moderate listings, orders, reviews, and returns.'));
children.push(bullet('Issue payouts, retry failed ones, and reconcile transactions.'));
children.push(bullet('Audit every consequential action — admin or seller — through an append-only log.'));
children.push(h3('At a glance'));
children.push(specTable([
  ['Category', 'Marketplace · social commerce · seller enablement'],
  ['Geography', 'Ghana (launch) · West Africa (expansion)'],
  ['Primary languages', 'English'],
  ['Payment rails', 'Paystack (cards, mobile money, bank)'],
  ['SMS provider', 'Arkesel (MTN, Telecel, AirtelTigo)'],
  ['Email delivery', 'Resend'],
  ['Media hosting', 'Cloudinary'],
  ['Web', 'verndly.com'],
  ['Admin', 'durabel dashboard (internal)'],
]));

// 4. PROBLEM STATEMENT
children.push(h1('4. Problem Statement'));
children.push(para('Most commerce in Ghana — and across West Africa — happens on Instagram, WhatsApp, and TikTok. That works for discovery, but the rest of the journey is broken:'));
children.push(h3('The buyer problem'));
children.push(bullet('No way to verify the seller is real. Scams are common, and recovering money is hard.'));
children.push(bullet('Checkout is a screenshot of a momo number. There is no order record, no receipt, no recourse.'));
children.push(bullet('No delivery promise. Buyers chase sellers through DMs and voice notes to find out where their order is.'));
children.push(h3('The seller problem'));
children.push(bullet('Social platforms were not built for commerce. There is no inventory, no analytics, no payouts, no checkout.'));
children.push(bullet('A serious-looking storefront, branded share images, and a real domain are out of reach without a designer and a developer.'));
children.push(bullet('Even competent sellers cap out at the operational limit of replying to DMs by hand.'));
children.push(h3('The market problem'));
children.push(bullet('Trust never accrues. Every transaction is a fresh negotiation. The category cannot scale.'));
children.push(bullet('Brands and aggregators have no clean way to reach social-commerce sellers as a distribution channel.'));
children.push(callout('The gap', 'There is no neutral, trustable layer between the social-platform discovery moment and a real, recoverable purchase.'));

// 5. OBJECTIVES & SUCCESS METRICS
children.push(h1('5. Objectives & Success Metrics'));
children.push(h2('5.1 Strategic objectives'));
children.push(numbered('Become the default credibility layer for social-commerce sellers in Ghana within 18 months.'));
children.push(numbered('Drive seller graduation: move every active seller from "informal DMs" to a published, verified Verndly store inside 60 days of signup.'));
children.push(numbered('Reach payment volume where transaction-fee revenue can sustain ops independently of subscription.'));
children.push(numbered('Expand to a second West African market on the back of proven Ghana unit economics.'));
children.push(h2('5.2 Headline KPIs'));
children.push(specTable([
  ['Activated sellers', 'Sellers who have published >= 1 product and received >= 1 paid order'],
  ['Verified-seller rate', 'Share of activated sellers carrying a verified badge'],
  ['GMV', 'Gross merchandise value (GHS) processed through Paystack per month'],
  ['Take rate', 'Effective platform fee as a % of GMV'],
  ['Pro conversion', 'Share of activated sellers on the paid Pro plan'],
  ['Repeat purchase rate', 'Share of buyers placing >= 2 orders within 90 days'],
  ['Payout reliability', 'Share of payouts that succeed on first attempt'],
  ['Time to first sale', 'Median days from seller signup to first paid order'],
]));
children.push(h2('5.3 Quality objectives'));
children.push(bullet('Sub-48-hour median verification turnaround.'));
children.push(bullet('Zero unrecorded admin moderation actions (every action lives in the audit log).'));
children.push(bullet('Payout dispute rate under 1% of completed payouts.'));

// 6. TARGET AUDIENCE
children.push(h1('6. Target Audience'));
children.push(h2('6.1 Buyers'));
children.push(para('Ghanaian shoppers aged 18-40 who already buy on Instagram and WhatsApp and want a less risky way to do it. They are price-sensitive, mobile-first, and care about delivery speed and proof.'));
children.push(h2('6.2 Sellers (Entrepreneurs)'));
children.push(para('Solo founders or two-person businesses running fashion, beauty, food, electronics, or homeware. They are technically capable enough to use Instagram and Canva but not so technical that they will build their own Shopify store. They want growth without becoming developers.'));
children.push(h2('6.3 Pro Sellers'));
children.push(para('Sellers who already have product-market fit and want the toolkit to look bigger than they are: shareable product cards, priority support, advanced storefront features, and a verified Pro badge. Pro is the upgrade for sellers who are ready to professionalise.'));
children.push(h2('6.4 Administrators'));
children.push(para('A small internal team running trust, payouts, and moderation through the Durabel dashboard. Every action they take is logged for accountability.'));

// 7. VALUE PROPOSITION
children.push(h1('7. Value Proposition'));
children.push(h2('For buyers'));
children.push(callout('Buy from real sellers, with a real receipt.', 'Every seller on Verndly has passed identity checks. Every order has a tracking page. Every payment is held against delivery. If something goes wrong, there is someone to call — not just a DM that goes dark.'));
children.push(h2('For sellers'));
children.push(callout('Run a real business from your phone.', 'Verndly handles the storefront, the checkout, the receipts, the payouts, and the customer trust. You handle the product. We take a fair fee on what sells — not a subscription you have to justify before you earn.'));
children.push(h2('For pro sellers'));
children.push(callout('Look as big as you actually are.', 'Pro unlocks shareable, branded product cards, advanced analytics, faster verification, priority support, and the verified Pro badge that buyers learn to trust.'));
children.push(h2('For partners & brands'));
children.push(callout('Distribution to verified sellers, at scale.', 'Verndly is the cleanest way to reach Ghana\'s social-commerce ecosystem as a single, addressable channel — sellers who are real, payable, and reachable.'));

// 8. CORE FEATURES
children.push(h1('8. Core Features'));
children.push(h2('8.1 Buyer Experience'));
children.push(bullet('Verified storefronts: every store carries a badge earned through identity and proof-of-sales review.'));
children.push(bullet('Secure checkout: Paystack rails for cards, mobile money, and bank — same trust as the banks behind them.'));
children.push(bullet('Order tracking: a live status from paid → processing → shipped → delivered, with email and in-app updates.'));
children.push(bullet('Reviews & ratings: verified-purchase reviews with flagging, moderation, and seller responses.'));
children.push(bullet('Returns & refunds: a structured return request flow with admin oversight and Paystack refunds.'));
children.push(bullet('Favourites & lists: save products, build wish lists, and pick up where you left off across devices.'));
children.push(h2('8.2 Seller Dashboard'));
children.push(bullet('Product management: title, description, up to three images, optional short video, variants (size/colour), stock, brand, category, and tags.'));
children.push(bullet('Bulk CSV import for sellers migrating an existing catalogue.'));
children.push(bullet('Order inbox with status workflow, customer details, and one-tap status updates.'));
children.push(bullet('Analytics: views, conversions, top products, and revenue by period.'));
children.push(bullet('Payout history and bank/momo connection (via Paystack subaccounts).'));
children.push(bullet('Store sharing kit: QR code, store link, and (for Pro sellers) branded product cards ready for social.'));
children.push(h2('8.3 Pro Membership'));
children.push(bullet('Verified Pro badge displayed next to the store name across the marketplace.'));
children.push(bullet('Branded share-card generator: portrait 4:5 PNGs in Verndly\'s palette, sized for Instagram and TikTok.'));
children.push(bullet('Hot Sales promotion slot on the homepage and category pages.'));
children.push(bullet('Priority verification queue (24-hour SLA vs. standard 48).'));
children.push(bullet('Priority support via WhatsApp and email.'));
children.push(bullet('Higher product limits, video uploads, and richer storefront customisation.'));
children.push(h2('8.4 Admin & Trust'));
children.push(bullet('Verification queue with documents, links, or "contact us" routes.'));
children.push(bullet('Moderation tools for products, orders, returns, and reviews.'));
children.push(bullet('Payout console: queue runs, retries, and per-payout history.'));
children.push(bullet('Audit log: append-only record of every admin and seller action that changes state — replay-safe and dispute-ready.'));
children.push(bullet('Notifications fan-out: email + SMS to admins on each new verification request.'));

// 9. HOW IT WORKS
children.push(h1('9. How It Works'));
children.push(h3('Seller journey'));
children.push(numbered('Sign up with email or Google. Verify the email address.'));
children.push(numbered('Create the store: store name, logo, location, delivery area, and bank/momo details.'));
children.push(numbered('Submit verification via store URL, ID + sales screenshots, or "contact us" route. Admin alerted by email + SMS.'));
children.push(numbered('Once approved (typical 24-48h), publish products. Each can have variants, photos, and a short video.'));
children.push(numbered('Receive orders. Update statuses as you fulfil. Verndly pays you out automatically, less the platform fee.'));
children.push(h3('Buyer journey'));
children.push(numbered('Land on verndly.com or a shared store/product link.'));
children.push(numbered('Browse products. Filter by category, region, delivery time, price, and tags.'));
children.push(numbered('Add to cart, check out via Paystack (cards / momo / bank).'));
children.push(numbered('Get an email receipt and an order tracking page.'));
children.push(numbered('Receive delivery, leave a review, or open a return request if needed.'));
children.push(h3('Trust + safety loop'));
children.push(numbered('Sellers are gated on identity verification before they can publish.'));
children.push(numbered('Buyers see verified badges, real reviews, and a live order status — not screenshots of a payment confirmation.'));
children.push(numbered('Admin moderation is logged and reviewable; sellers can dispute and reference the audit trail.'));

// 10. TECHNOLOGY & ARCHITECTURE
children.push(h1('10. Technology & Architecture'));
children.push(para('Verndly runs on a modern, sustainable stack designed for fast iteration and operational safety. Marketing usually does not need this section — it is here for press conversations and partner due diligence.'));
children.push(h3('Stack'));
children.push(specTable([
  ['Web (storefront + dashboard)', 'Next.js 16 (App Router), Tailwind CSS, Framer Motion, Zustand'],
  ['Mobile-friendly', 'Responsive web; native mobile on roadmap'],
  ['API', 'NestJS (TypeScript) on Node.js 20'],
  ['Database', 'PostgreSQL (Supabase) via Prisma ORM'],
  ['Cache', 'Redis (optional, in-memory fallback)'],
  ['Media', 'Cloudinary (image/video transforms + CDN)'],
  ['Payments', 'Paystack (split payments, subaccounts, payouts, webhooks)'],
  ['Email', 'Resend (transactional templates)'],
  ['SMS', 'Arkesel (Ghana-native delivery)'],
  ['Auth', 'JWT, Google OAuth, 2FA (TOTP + SMS)'],
  ['Admin dashboard', 'Durabel (Next.js)'],
  ['Hosting', 'Vercel (web) + Render (API)'],
]));
children.push(h3('Why these choices matter'));
children.push(bullet('Local payment + SMS providers (Paystack, Arkesel) mean fewer failed transactions and better deliverability than global defaults.'));
children.push(bullet('A single TypeScript stack across web and API keeps the engineering team small and shipping fast.'));
children.push(bullet('Cloudinary handles the heavy lifting of media at the bandwidth costs of Ghana — auto-optimised images and videos.'));

// 11. SECURITY, TRUST & COMPLIANCE
children.push(h1('11. Security, Trust & Compliance'));
children.push(h3('Platform security'));
children.push(bullet('Strict Content-Security-Policy, HSTS (2 years, includeSubDomains, preload), X-Frame-Options DENY, and Permissions-Policy on every web response.'));
children.push(bullet('All passwords are bcrypt-hashed; sessions are JWT with short-lived access tokens.'));
children.push(bullet('Two-factor authentication available for all roles, mandatory for admins.'));
children.push(bullet('Webhook signature verification with constant-time compare; atomic dedupe against replay attacks.'));
children.push(h3('Operational security'));
children.push(bullet('Append-only audit log captures every admin and seller action that mutates state — suspensions, moderation, role changes, product CRUD, payout retries — with actor, IP, user agent, and before/after diff.'));
children.push(bullet('Role-based access control across USER / SELLER / ADMIN.'));
children.push(bullet('Rate limiting on auth and recovery endpoints to deter brute force.'));
children.push(h3('User trust'));
children.push(bullet('Sellers are gated on verification (identity, proof of sales, store URL, or manual contact).'));
children.push(bullet('Buyer reviews are tied to verified purchases.'));
children.push(bullet('Suspension and warnings are logged and trigger email notifications to the affected user.'));
children.push(h3('Compliance posture'));
children.push(bullet('Personal data handled in line with Ghana\'s Data Protection Act (2012).'));
children.push(bullet('Payment data never touches Verndly servers — Paystack-hosted checkout keeps PCI scope minimal.'));
children.push(bullet('Transactional emails identify Verndly as the sender, with unsubscribe handling on marketing emails only.'));

// 12. PAYMENTS & PAYOUTS
children.push(h1('12. Payments & Payouts'));
children.push(h3('How money moves'));
children.push(numbered('Buyer pays through Paystack at checkout (card, mobile money, or bank).'));
children.push(numbered('Paystack collects the funds and notifies Verndly via a signed webhook.'));
children.push(numbered('Verndly records the transaction in a double-entry ledger and credits the seller\'s subaccount, net of platform fee.'));
children.push(numbered('Payouts are processed on a regular schedule — and admins can issue them manually from the dashboard.'));
children.push(numbered('Sellers receive an email when a payout is sent. Failed payouts surface for retry.'));
children.push(h3('Fees'));
children.push(bullet('Verndly charges a platform fee on each successful sale. The exact percentage is configurable and disclosed to sellers in the dashboard.'));
children.push(bullet('Paystack\'s processing fees are paid by Verndly out of the platform fee — sellers see one clean number.'));
children.push(h3('Reliability'));
children.push(bullet('Webhook handling is replay-safe: duplicate deliveries from Paystack are deduped on event ID and never trigger duplicate payouts.'));
children.push(bullet('Payout retries are audited; a payout that fails three times is escalated to the ops team automatically.'));

// 13. BUSINESS MODEL
children.push(h1('13. Business Model'));
children.push(h3('Revenue streams'));
children.push(bullet('Transaction fee on every paid order (primary).'));
children.push(bullet('Pro membership subscription (monthly) for sellers who want the upgraded toolkit.'));
children.push(bullet('Hot Sales promotional slots — sellers pay to feature a product on the homepage and category pages.'));
children.push(bullet('(Roadmap) Logistics revenue share, branded ads, and B2B distribution APIs.'));
children.push(h3('Unit economics shape'));
children.push(bullet('Variable cost per order: Paystack fee + Cloudinary bandwidth + email/SMS cost.'));
children.push(bullet('Fixed cost: hosting, support, and the ops/moderation team.'));
children.push(bullet('Pro acts as a margin booster — subscription revenue carries the platform between transaction-fee cycles.'));
children.push(h3('Why this model'));
children.push(para('Charging only on success aligns Verndly\'s incentives with the seller\'s. Sellers do not pay to start; they pay when the platform delivers them revenue. Pro is the optional accelerator for sellers who have already proven they have something to sell.'));

// 14. BRAND GUIDELINES
children.push(h1('14. Brand Guidelines'));
children.push(h3('Voice'));
children.push(bullet('Confident, direct, no hype. We sell results, not adjectives.'));
children.push(bullet('We talk about sellers as entrepreneurs, not "merchants" or "vendors".'));
children.push(bullet('We talk about buyers as buyers — not "users" or "consumers".'));
children.push(h3('Tone'));
children.push(bullet('Casual but precise. Short sentences. Active verbs.'));
children.push(bullet('Always pair a promise with a proof point (a feature, a number, a guarantee).'));
children.push(bullet('Avoid jargon: "marketplace," "AI," "platform," "ecosystem" — use them only when they earn their place.'));
children.push(h3('Visual'));
children.push(specTable([
  ['Primary palette', 'Black (#0A0A0A) · White (#FFFFFF) · Red 500 (#E11D48)'],
  ['Accent use', 'Red is for price, CTA, and emphasis — not body type'],
  ['Type', 'Modern sans-serif. System UI on web, Arial as the fallback'],
  ['Imagery', 'Real seller photos. Lifestyle context. Avoid stock'],
  ['Logo', 'Wordmark, white on dark or black on light. Never recolour'],
]));
children.push(h3('What to avoid'));
children.push(bullet('Saying Verndly "disrupts" anything. We replace screenshots of momo numbers with receipts. That is enough.'));
children.push(bullet('Comparing Verndly to Amazon. Wrong frame; wrong continent.'));
children.push(bullet('Using stock photos of "happy African entrepreneurs". Use real sellers — we have a release-form template.'));

// 15. ROADMAP
children.push(h1('15. Roadmap (next 12 months)'));
children.push(para('This list is directional, not a commitment. Marketing should not pre-announce dated launches without product sign-off.'));
children.push(h3('Now (in production)'));
children.push(bullet('Verified storefronts, Paystack checkout, payouts, reviews, returns.'));
children.push(bullet('Pro membership with branded share cards, Hot Sales, priority verification.'));
children.push(bullet('Admin audit log, manual payout console, hardened webhook pipeline.'));
children.push(h3('Next (planned for Q3-Q4 2026)'));
children.push(bullet('Native mobile app (iOS + Android) with push notifications.'));
children.push(bullet('In-app messaging between buyer and seller.'));
children.push(bullet('Logistics integrations with local couriers.'));
children.push(bullet('Pro analytics: cohorted buyer retention, search-term insights.'));
children.push(h3('Later (exploratory)'));
children.push(bullet('Cross-border buyer access (diaspora purchases on behalf of recipients).'));
children.push(bullet('Wholesale / B2B catalog tier for verified brands.'));
children.push(bullet('Embedded credit for sellers (working capital tied to GMV).'));

// 16. TALKING POINTS
children.push(h1('16. Talking Points for Marketing'));
children.push(h3('When asked "what is Verndly?"'));
children.push(callout('Default answer (15 seconds)', 'Verndly is a marketplace for Ghana\'s social-commerce sellers — Instagram and WhatsApp sellers who want a real storefront, real payments, and real customer trust without becoming a tech company.'));
children.push(h3('When asked "how is it different from X?"'));
children.push(bullet('vs. Instagram/WhatsApp: those are discovery tools. Verndly is the transaction layer that turns discovery into a real, recoverable purchase.'));
children.push(bullet('vs. Jumia / Tonaton: those are classified marketplaces. Verndly is a verified seller marketplace — buyers know who they are buying from.'));
children.push(bullet('vs. Shopify: Shopify is for the seller who hires a developer. Verndly is for the seller who runs the business themselves, on their phone.'));
children.push(h3('When asked "is it safe?"'));
children.push(bullet('Every seller has passed identity and proof-of-sales verification.'));
children.push(bullet('Payments go through Paystack — the same rails the banks use.'));
children.push(bullet('Every admin action is logged. Disputes are reviewable.'));
children.push(h3('When asked "what does it cost a seller?"'));
children.push(bullet('Zero to start. We take a percentage of each sale.'));
children.push(bullet('Pro is optional, monthly, and unlocks the upgraded toolkit.'));
children.push(h3('Things to never say'));
children.push(bullet('"Guaranteed delivery" — we do not fulfil; sellers do.'));
children.push(bullet('"Money-back guarantee" — refunds are case-by-case via our returns flow.'));
children.push(bullet('"We make sellers rich" — we make sellers credible. Big difference.'));

// 17. FAQ
children.push(h1('17. FAQ'));
children.push(h3('Is Verndly free to join?'));
children.push(para('Yes for both buyers and sellers. Sellers pay a small fee on each successful sale. Pro membership is optional and paid monthly.'));
children.push(h3('How does a seller get verified?'));
children.push(para('They submit one of three things: a store URL (Instagram, Shopify, etc.), an ID + screenshots of past sales, or a request for manual review via WhatsApp/email. Admins respond within 24-48 hours.'));
children.push(h3('What if a buyer does not receive their order?'));
children.push(para('Buyers can open a return/refund request from the order page. Verndly\'s ops team reviews disputes against the seller\'s response and the audit trail before issuing a Paystack refund where appropriate.'));
children.push(h3('Can sellers operate outside Ghana?'));
children.push(para('The current platform is Ghana-first. Sellers in neighbouring countries can register but cannot yet receive payouts. Cross-border expansion is on the roadmap.'));
children.push(h3('Does Verndly handle delivery?'));
children.push(para('Not directly today. Sellers fulfil orders themselves or via their own courier. Logistics integrations are on the roadmap.'));
children.push(h3('Is there a mobile app?'));
children.push(para('The web app is mobile-first and works well on every modern phone. Native iOS and Android apps are planned.'));
children.push(h3('How is buyer data protected?'));
children.push(para('Personal data is handled in line with Ghana\'s Data Protection Act. Payment details never touch Verndly servers — Paystack hosts the checkout. Buyers can request data export or deletion from their account settings.'));
children.push(h3('Who owns the seller\'s store and customer data?'));
children.push(para('The seller does. Verndly is the operator of the marketplace; sellers retain rights to their own catalogue, branding, and customer relationships built on the platform.'));

// 18. GLOSSARY
children.push(h1('18. Glossary'));
children.push(specTable([
  ['Activated seller', 'A seller who has published at least one product and received at least one paid order'],
  ['Admin', 'Internal Verndly team member with access to moderation, payouts, and the audit log'],
  ['Audit log', 'Append-only record of every consequential admin and seller action — actor, IP, before/after, reason'],
  ['Buyer', 'A user purchasing from a Verndly store'],
  ['GMV', 'Gross merchandise value — total GHS value of paid orders before fees and refunds'],
  ['Hot Sales', 'Paid promotional slot on the homepage and category pages'],
  ['Pro', 'Paid monthly subscription tier with upgraded toolkit and verified Pro badge'],
  ['Payout', 'Transfer of a seller\'s earned funds (less fees) to their bank or mobile money account'],
  ['Paystack', 'Payment processor handling all card, momo, and bank transactions'],
  ['Seller / Entrepreneur', 'A user with a verified storefront on Verndly'],
  ['Subaccount', 'A Paystack-side account scoped to one seller, used for split payments and payouts'],
  ['Take rate', 'Verndly\'s effective platform fee as a percentage of GMV'],
  ['Verification', 'Process by which a new seller establishes identity and proof of sales before publishing'],
]));

// 19. APPENDIX & CONTACT
children.push(h1('19. Appendix & Contact'));
children.push(h3('Primary surfaces'));
children.push(specTable([
  ['Marketplace', 'https://verndly.com'],
  ['Admin dashboard', 'Durabel — internal access only'],
  ['Status page', 'TBD'],
  ['Support email', 'support@verndly.com'],
  ['Press / partnerships', 'hello@verndly.com'],
]));
children.push(h3('Marketing handover checklist'));
children.push(bullet('Confirm the version number on the cover matches the latest internal release.'));
children.push(bullet('Replace placeholder URLs (status page, social handles) before any external share.'));
children.push(bullet('When quoting numbers (GMV, seller count), source them from the latest leadership update — not this document.'));
children.push(bullet('When using brand assets, pull the current logo and palette tokens from the design drive.'));
children.push(h3('Document control'));
children.push(specTable([
  ['Version', '1.0'],
  ['Status', 'Approved for internal circulation'],
  ['Owner', 'Verndly Product Team'],
  ['Review cycle', 'Quarterly, or on any major release'],
  ['Next review', 'August 2026'],
]));

// 20. GO-LIVE BUDGET
children.push(h1('20. Go-Live Budget'));
children.push(para('The total cash required to take Verndly from "ready to deploy" to "publicly launched and able to onboard the first 50 sellers". Figures are in US dollars (USD) and assume a 12-week launch window. Annual costs are pro-rated; recurring costs are shown both monthly and across the first 12 months so the runway is explicit.'));
children.push(para('Numbers in the first table are line items already approved by the founding team. The second table lists items the team flagged as missing or under-scoped — these are recommendations to scrutinise, not commitments.'));

children.push(h2('20.1 Approved line items'));
children.push(specTable([
  ['Line item', 'Cost (USD)'],
  ['Domain (verndly.com, 1 year)', '$48'],
  ['Server / hosting', '$74'],
  ['Marketing assets (launch creative pack)', '$66'],
  ['Email domain (workspace / mailbox setup, 1 year)', '$14'],
  ['Database', '$45'],
  ['Subtotal — approved', '$247'],
]));
children.push(para('Note: the team should confirm which of the approved items are one-time vs. monthly. The breakdown below assumes the most defensible interpretation: domain and email domain are annual; server, database, and marketing assets are one-time launch outlays. Adjust if your contracts say otherwise.'));

children.push(h2('20.2 Recommended additions (often missed)'));
children.push(para('These are commonly under-budgeted for a Ghana-based marketplace launch. Each row has a justification so leadership can cut what does not apply.'));
children.push(specTable([
  ['Line item', 'Cost (USD)'],
  ['Cloudinary (media CDN, free tier covers month 1-3)', '$0 / then ~$99/mo'],
  ['Resend (transactional email, free 3k/mo, then Pay-as-you-go)', '$0 / then ~$20/mo'],
  ['Arkesel SMS credits (2FA + admin alerts, prepay)', '$30 prepay'],
  ['Paystack (no setup fee; per-transaction fee passed to GMV)', '$0'],
  ['Vercel Pro (web hosting, only if launching with team seats)', '$20/mo per seat'],
  ['Sentry error monitoring (free tier OK to start)', '$0 / then ~$26/mo'],
  ['Cloudflare DNS + WAF (free tier)', '$0'],
  ['SSL certificates (Vercel + Render auto-issue)', '$0'],
  ['Logo and brand polish (if not in marketing assets)', '$150 one-time'],
  ['Launch photography (5-10 real seller shoots)', '$200 one-time'],
  ['Legal: Terms of Service + Privacy Policy (Ghana counsel)', '$300-500 one-time'],
  ['Ghana Data Protection Commission registration', '$25-50 one-time'],
  ['RGD business registration (if not yet done)', '$70-135 one-time'],
  ['Seed-seller incentives (5 micro-influencers × $50)', '$250 one-time'],
  ['Press release distribution (Ghana wire + 2 outlets)', '$100 one-time'],
  ['Customer support tooling (HelpScout free, or shared inbox)', '$0'],
  ['Backups (included in Supabase Pro if used)', '$0'],
  ['Contingency (15% of total launch spend)', 'See total below'],
  ['Subtotal — recommended (low / high)', '~$1,150 / ~$1,600'],
]));

children.push(h2('20.3 Total cost of go-live (first 90 days)'));
children.push(para('Combining approved items, recommended additions, and 90 days of recurring SaaS costs:'));
children.push(specTable([
  ['Category', 'Low → High (USD)'],
  ['Approved line items (Section 20.1)', '$247 → $247'],
  ['Recommended one-time additions', '$1,145 → $1,475'],
  ['Recurring SaaS (months 1-3, post free tier)', '$0 → $510'],
  ['Subtotal', '$1,392 → $2,232'],
  ['+ Contingency (15%)', '$209 → $335'],
  ['TOTAL TO GO LIVE (90 days)', '$1,601 → $2,567'],
]));

children.push(h2('20.4 Recurring monthly burn after launch'));
children.push(specTable([
  ['Item', 'Monthly cost (USD)'],
  ['Server / hosting (Render)', '$25-95'],
  ['Database (Supabase Pro)', '$25'],
  ['Cloudinary Plus (media CDN, after free tier)', '$99'],
  ['Resend (email, beyond free tier)', '$20'],
  ['Sentry Team (error monitoring, optional)', '$26'],
  ['Arkesel SMS top-ups (volume-driven, estimated)', '$10-50'],
  ['Vercel Pro (per team seat, optional)', '$20'],
  ['Domain + email renewals (amortised)', '$6'],
  ['Estimated monthly burn', '$231-341'],
]));

children.push(h2('20.5 Revenue assumptions to break even'));
children.push(para('Break-even is the GMV at which platform fees cover monthly burn. Assuming a 5% effective take rate (Paystack fees deducted):'));
children.push(specTable([
  ['Monthly burn (mid estimate)', '$285'],
  ['Implied monthly GMV to break even', '~$5,700 (~GHS 70,000)'],
  ['Activated sellers needed (at $200 avg monthly GMV/seller)', '~28 sellers'],
  ['Activated sellers needed (at $500 avg monthly GMV/seller)', '~12 sellers'],
]));

children.push(h2('20.6 Risk lines (not included in the totals above)'));
children.push(bullet('Refund / chargeback float — set aside ~$200 working capital to cover Paystack refunds before reconciliation.'));
children.push(bullet('Founders\' time and any contractor / part-time staff — explicitly excluded from this budget.'));
children.push(bullet('Tax obligations (VAT, income tax) — Ghana Revenue Authority compliance; estimate 5-10% of net revenue.'));
children.push(bullet('Customer acquisition cost beyond seed-seller incentives — Meta/Google ads budget should be a separate line item once unit economics are validated.'));
children.push(bullet('Cross-border expansion costs — out of scope until Ghana unit economics are proven.'));

children.push(h2('20.7 Approval & ownership'));
children.push(specTable([
  ['Budget owner', 'Verndly Founding Team'],
  ['Approved by', '_________________________ (date: __________)'],
  ['Finance lead', '_________________________'],
  ['Review cadence', 'Monthly until break-even, then quarterly'],
  ['Source of truth', 'This document (Section 20)'],
]));

children.push(blank());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [run('— End of document —', { italics: true, size: 20, color: SUBTLE })],
}));

// ─── document ──────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Verndly Product Team',
  title: 'Verndly Official Documentation',
  description: 'Marketing & stakeholder briefing for the Verndly platform.',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: INK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: INK },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: INK },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: 'numbers', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ],
  },
  sections: [
    {
      properties: { page: PAGE },
      children,
    },
  ],
});

const outPath = path.join(__dirname, 'Verndly_Official_Documentation.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log('Wrote', outPath, '(' + buffer.length + ' bytes)');
});
