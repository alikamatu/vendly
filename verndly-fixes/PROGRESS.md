# PROGRESS LOG

Append one entry per loop. Newest at the bottom.

## Entry template

```
### <date> — T<nn> <task name> — status: [x] | [~] | [!]
- Items closed: <IDs>
- Items open / blocked: <IDs + reason>
- Files changed: <paths>
- NEEDS-HUMAN: <question, or "none">
- Verification: <what was run / checked>
- Commit: <hash>
```

## Log

### 2026-11-24 — T01 Contact email and structured data — status: [x]

- Items closed: SW-01, SW-02
- Items open / blocked: none
- Files changed: apps/web/lib/contact.ts, apps/web/components/layout/Footer.tsx, apps/web/app/contact/page.tsx, apps/web/app/faq/page.tsx, apps/web/components/seo/OrganizationJsonLd.tsx, apps/api/scripts/seed-admin.ts, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: SW-02 — create and confirm official social accounts (order: Instagram, Facebook, WhatsApp Channel, then X/LinkedIn) before adding any URLs back to `Organization.sameAs`.
- Verification: `git grep -ni "alikamatu14@gmail" apps/ packages/` returned 0 matches; `OrganizationJsonLd.tsx` has no `sameAs` URLs (comment only); `pnpm --filter @vendly/web type-check` and ESLint passed with 0 errors.
- Commit: 8e3e632

### 2026-11-24 — T02 Apple/Nike brand rail and source records — status: [~]

- Items closed: HM-01, CT-01 (code + guard complete)
- Items open / blocked: PD-01, PD-02 — production DB updates scripted in `scripts/data-fixes/T02-pd01-gas-burner.sql` and `scripts/data-fixes/T02-pd02-chill-hoodie.sql`, awaiting owner approval to run; seller factual descriptions also pending.
- Files changed: apps/web/lib/brand-guard.ts, apps/web/components/home/BrandSectionsList.tsx, apps/web/lib/home/brand-grouping.ts, apps/web/components/categories/CategoriesGalleryClient.tsx, apps/web/app/product/[id]/layout.tsx, apps/web/components/seo/ProductJsonLd.tsx, apps/web/app/api/cards/product/[id]/route.tsx, apps/web/app/products/page.tsx, scripts/data-fixes/T02-pd01-gas-burner.sql, scripts/data-fixes/T02-pd02-chill-hoodie.sql, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: (1) Approve and run `scripts/data-fixes/T02-pd01-gas-burner.sql` and `scripts/data-fixes/T02-pd02-chill-hoodie.sql` against production DB. (2) PD-01: seller must rewrite Gas burner description with fuel type, burners, dimensions, and box contents before re-featuring. (3) PD-02: confirm whether Chill Hoodie seller is authorized for Nike (otherwise leave brand empty) and ask seller to add material, size, and condition details.
- Verification: `pnpm --filter @vendly/web type-check` and ESLint passed with 0 errors; brand rail & popular brands gated behind `SHOW_BRAND_RAIL` (default `false`); deny-list suppresses unauthorized Apple/Nike brand strings across JSON-LD, meta keywords, card images, and filter lists.
- Commit: 9a42eb8

### 2026-11-24 — T03 The Hoodies catalog and location data — status: [~]

- Items closed: PD-03 (code guard: removed "No description provided" placeholder and required >=20 char description on publish)
- Items open / blocked: ST-01, ST-02, PD-03 DB updates — scripts committed in `scripts/data-fixes/T03-st01-the-hoodies-area.sql` and `scripts/data-fixes/T03-st02-pd03-the-hoodies-categories.sql`, awaiting owner approval and seller confirmations.
- Files changed: apps/web/components/product-detail/ProductDetailClient.tsx, apps/mobile/src/app/product/[id].tsx, apps/web/components/products/ProductForm.tsx, scripts/data-fixes/T03-st01-the-hoodies-area.sql, scripts/data-fixes/T03-st02-pd03-the-hoodies-categories.sql, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: (1) ST-01: confirm with `/s/the-hoodies` seller whether "Airpot 225" should be "Airport 225" before running `T03-st01-the-hoodies-area.sql`. (2) ST-02 & PD-03: approve and run `T03-st02-pd03-the-hoodies-categories.sql`. (3) PD-03: ask seller for African Dress factual description (style, size, fabric, fit).
- Verification: `git grep -ni "No description provided for this item" apps/` returned 0 matches; `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: 79f55ec

### 2026-11-24 — T04 Rejected listing is still public — status: [x]

- Items closed: ST-03
- Items open / blocked: none
- Files changed: apps/api/src/product/product-visibility.ts, apps/api/src/product/product-visibility.spec.ts, apps/api/src/product/product.service.ts, apps/api/src/product/product.controller.ts, apps/web/lib/product-visibility.ts, apps/web/app/product/[id]/page.tsx, apps/web/app/product/[id]/layout.tsx, apps/web/app/s/[slug]/page.tsx, apps/web/app/s/[slug]/layout.tsx, apps/web/components/store/StorefrontClient.tsx, apps/web/app/sitemap.ts, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: Sobolo (`/product/c3661485-6244-4db1-8fae-3c7713e1f52d`) was left untouched (`status: rejected`); if the owner wants it sold, approve it, add a description, and restock it.
- Verification: Jest `product-visibility.spec.ts` passed (4/4 tests: rejected product → 404 when logged out, owner/admin preview allowed, store listing excludes rejected); `pnpm --filter @vendly/api run build` and `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: 09f8382

### 2026-11-24 — T05 About page — status: [x]

- Items closed: AB-01, AB-02
- Items open / blocked: none
- Files changed: apps/web/app/about/page.tsx, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: AB-01 — confirm if named team members actually shipped software at Anthropic, Paystack, or Flutterwave; safe fallback copy is live by default.
- Verification: `grep -iE "Legally Binding|Document Version|Anthropic|Flutterwave" apps/web/app/about/page.tsx` returned 0 matches; `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: 5e963b8

### 2026-11-24 — T06 FAQ schema contradicts the product — status: [x]

- Items closed: FQ-01, FQ-02
- Items open / blocked: none
- Files changed: apps/web/lib/content/faq.ts, apps/web/app/faq/layout.tsx, apps/web/app/faq/page.tsx, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: FQ-02 — confirm if any sellers are permitted to offer Cash on Delivery; default prepaid-only wording is applied to match `/sell`.
- Verification: `grep -nE "Cash on Delivery|Vodafone/|business registration documents" apps/web/app/faq/* apps/web/lib/content/faq.ts` returned 0 matches; visible FAQ and FAQPage JSON-LD render from the single `SITE_FAQ_ITEMS` array; `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: 7cba055

### 2026-11-24 — T07 Jumia calculator and fee blog — status: [x]

- Items closed: SL-01, BL-01
- Items open / blocked: none
- Files changed: apps/web/lib/content/jumia-rates-2026.ts, apps/web/lib/content/jumia-rates-2026.test.mjs, apps/web/components/editorial/FeeCalculator.tsx, apps/web/components/editorial/VisualDiagrams.tsx, apps/web/lib/content/blog-posts-core.ts, apps/web/lib/content/blog-posts-extended.ts, apps/web/public/llms.txt, apps/web/public/llms-full.txt, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: none
- Verification: `node --test apps/web/lib/content/jumia-rates-2026.test.mjs` passed (3/3: GH₵ 2,500 phone & GH₵ 200 fashion exact match); `git grep` confirmed 0 stale 5–20% rates; `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: c35d9fb

### 2026-11-24 — T08 Delivery and coverage claims — status: [x]

- Items closed: HM-02, SW-04, SL-02, AB-03, SH-01
- Items open / blocked: none
- Files changed: apps/web/lib/copy/coverage.ts, apps/web/components/home/HomeView.tsx, apps/web/components/layout/Footer.tsx, apps/web/app/sell/page.tsx, apps/web/app/about/page.tsx, apps/web/app/shipping/page.tsx, apps/web/components/legal/LegalPage.tsx, apps/web/app/categories/[slug]/page.tsx, apps/web/components/editorial/VisualDiagrams.tsx, apps/web/lib/content/categories.ts, apps/web/lib/content/blog-posts-core.ts, apps/web/lib/content/blog-posts-extended.ts, apps/web/app/privacy/page.tsx, apps/web/public/llms.txt, apps/web/public/llms-full.txt, verndly-fixes/TASKS.md, verndly-fixes/PROGRESS.md
- NEEDS-HUMAN: none
- Verification: `git grep -niE "16 Regions|All 16|Nationwide Dispatch|Tamale|West Africa|International Orders" apps/web/` confirmed zero overclaimed copy in visible UI (only preserved URL slug `nationwide-delivery-ghana-accra-kumasi-takoradi-tamale` to avoid breaking links); `pnpm --filter @vendly/web type-check` passed with 0 errors.
- Commit: `b809f51`

### 2026-11-24 — T09 (HM-03, HM-04, PD-04) — [~]

- Changed:
  - `apps/web/lib/product-visibility.ts`: added `filterRailProducts` reusing `isPubliclyVisibleInStock` from T04 so homepage rails only display approved, in-stock listings.
  - `apps/web/components/home/TopDeals.tsx`: filtered deals through `filterRailProducts` (excludes `quantity_available = 0` such as the PD-04 jacket) and changed description to `Limited-time markdowns from verified sellers.` (removed `"Going fast."`).
  - `apps/web/components/home/FeaturedMarketplace.tsx`, `apps/web/components/home/RecentProducts.tsx`, `apps/web/components/home/BrandSectionsList.tsx`, `apps/web/components/home/HomeView.tsx`, `apps/web/app/page.tsx`, `apps/web/lib/server-api.ts`: applied `filterRailProducts` / `in_stock=true` across every homepage rail and SSR `ItemListJsonLd`.
  - `apps/web/components/home/TopProVendors.tsx`: updated heading to `Featured Pro sellers in Accra` and made description dynamically count API Pro stores (`Two Pro stores on Verndly right now — more selling spots opening as new merchants are verified.` when 2).
  - `apps/api/src/product/product.service.ts`: applied `PUBLIC_IN_STOCK_PRODUCT_WHERE` to `getRecentProducts` and `searchProducts`, and excluded `quantity_available = 0` in `getProducts` when searching or querying featured/discounted deals (unless `inStock=false` is explicitly passed).
  - `apps/api/src/product/product-visibility.spec.ts` & `apps/web/lib/product-visibility.test.mjs`: added mock-product tests verifying qty-0 items (including the −53% jacket) never appear in homepage rails or search.
  - `scripts/data-fixes/T09-pd04-zip-up-jacket.sql`: committed (NOT run) SQL script to move PD-04 (`c5537034-4bfd-4460-b1bc-c469ab1827bb`) from `General` → `Fashion` and rewrite title to `Men's black zip-up hooded jacket`.
- Verified:
  - `node --test apps/web/lib/product-visibility.test.mjs` — passed.
  - `pnpm --filter @vendly/api test -- product-visibility.spec.ts` — passed.
  - `pnpm --filter @vendly/web type-check` and `pnpm --filter @vendly/api run build` — passed.
  - `git grep -niE "Going fast|across the Verndly marketplace" apps/` — 0 matches.
- NEEDS-HUMAN:
  - **PD-04**: Confirm with the seller whether to keep and restock `/product/c5537034-4bfd-4460-b1bc-c469ab1827bb` or archive it, and approve running `scripts/data-fixes/T09-pd04-zip-up-jacket.sql`.
- Commit: `d765d4e`

### 2026-11-24 — T10 (SW-03, SL-03) — [~]

- Changed:
  - `apps/web/lib/copy/escrow-and-fees.ts`: added shared `ESCROW_AND_FEE_COPY` single source of truth for escrow timing (`Payments held in Paystack escrow until delivery and the 7-day inspection window`) and Paystack payout transfer fee disclosure (`The 4% includes Paystack's 1.95% collection fee. Paystack payout transfer fees (currently GHS 1 to MoMo, GHS 8 to bank) are charged on settlement.`).
  - `apps/web/components/layout/Footer.tsx`: replaced `"Payments held safely until order confirmation"` in the global trust bar with `ESCROW_AND_FEE_COPY.escrowTrustBarDesc`.
  - `apps/web/app/sell/page.tsx`: updated the 4% fee summary card and Paystack fee FAQ with `ESCROW_AND_FEE_COPY.feeSettlementDisclosure` and removed `"all-in"` / `"not charged a separate Paystack processing fee on top"` ambiguity.
  - `apps/web/components/editorial/FeeCalculator.tsx`: updated the fee pill (`4% flat fee`) and methodology footnote to include `ESCROW_AND_FEE_COPY.feeSettlementDisclosure` so calculator copy matches `/sell`.
  - `apps/web/lib/content/blog-posts-core.ts` & `apps/web/public/llms-full.txt`: aligned fee disclosure wording.
- Payout-fee code investigation (`apps/api/src/payments/payments.service.ts:617-697`):
  - `releaseEscrowForOrder` calculates `fee = gross * 4%`, `net = gross - fee` (96%), and `processTransferToSeller` calls Paystack `POST /transfer` with `source: 'balance'` and `amount: Math.round(Number(net) * 100)`.
  - In code today, Verndly does **not** deduct Paystack's transfer fee (GHS 1 MoMo / GHS 8 bank) from `net` — Paystack bills the transfer fee against Verndly's Paystack balance. Applied the safe default disclosure per T10 pending explicit owner confirmation.
- Verified:
  - `git grep -ni "Payments held safely until order confirmation" apps/` — 0 matches.
  - `pnpm --filter @vendly/web type-check` — 0 errors.
- NEEDS-HUMAN:
  - **SL-03**: Confirm whether Verndly's business policy is to absorb Paystack payout transfer fees (GHS 1 MoMo / GHS 8 bank, which matches current `processTransferToSeller` behavior) — if so, switch `ESCROW_AND_FEE_COPY.feeSettlementDisclosure` to state that Verndly absorbs them; otherwise update payout logic to deduct transfer fees on settlement.
- Commit: `367ebd8`

### 2026-11-24 — T11 (CT-02) — [x]

- Changed:
  - `apps/web/components/categories/CategoriesGalleryClient.tsx`: filtered categories to only those with ≥ 1 approved, in-stock listing (reusing `filterRailProducts` from T04/T09), removed the `"Verified category"` empty-tile label in favor of actual listing counts, rewrote the intro to `"Browse categories from verified independent sellers in Accra."`, and rendered a simple list with a link to `/products` when fewer than 3 categories qualify. Seller listing taxonomy remains unchanged.
  - `apps/web/app/categories/layout.tsx`: aligned metadata and CollectionPage JSON-LD copy to Accra catalog.
  - `apps/web/components/home/FeaturedCategories.tsx`: applied `filterRailProducts` so homepage category tiles also count only approved, in-stock products.
  - `apps/web/app/sitemap.ts`: emitted `/categories/[slug]` sitemap entries only for categories with ≥ 1 approved, in-stock product (ready to coordinate with T15).
- Verified:
  - `git grep -ni "Verified category" apps/web/` — 0 matches.
  - `pnpm --filter @vendly/web type-check` — 0 errors.
- Commit: `af5aae3`

### 2026-11-24 — T12 (PD-05, PD-06) — [~]

- Changed:
  - `apps/web/lib/product-badges.ts` & `apps/web/lib/product-badges.test.mjs`: added conservative `TRENDING_THRESHOLDS` + `isProductTrending()` (requires in-stock plus `views_7d >= 50` OR `orders_7d >= 5` OR `views_count >= 100 && rating_count >= 3`) and shared Ghana-accurate `SERVICE_AREA_LABELS` (`SAME_CITY: 'Same city only'`, `NEARBY_STATES: 'Nearby areas'`, `NATIONWIDE: 'Delivery set by seller'`).
  - `apps/web/components/product-detail/ProductDetailClient.tsx`: gated `"Trending Now"` badge behind `isProductTrending(product)` so 0-view / 0-review listings never show it.
  - `apps/web/components/product-detail/SellerCard.tsx`, `apps/web/components/store/StorefrontHeader.tsx`, `apps/web/components/onboarding/ServiceAreaSelect.tsx`, `apps/web/hooks/useProductsBrowser.ts`: replaced `"Nearby states"` with `"Nearby areas"` and aligned `"Nationwide"` labels to `"Delivery set by seller"` / `"Inter-regional (seller-arranged)"` per T08.
  - `scripts/data-fixes/T12-pd05-women-pink-rose.sql`: committed (NOT run) placeholder SQL script for `/product/29e33ade-701f-4731-9394-71346e4b6244`.
  - Confirmed seller form description guard (≥ 20 chars on publish) is enforced in `apps/web/components/products/ProductForm.tsx` (added in T03).
- Verified:
  - `node --test apps/web/lib/product-badges.test.mjs` — passed.
  - `git grep -ni "Nearby states" apps/ packages/` — 0 matches.
  - `pnpm --filter @vendly/web type-check` — 0 errors.
- NEEDS-HUMAN:
  - **PD-05**: Confirm garment type, real color (currently Red vs title Pink/Rose White), gender (`Women's` vs `Unisex`), and a ≥ 20 char description with the seller for `/product/29e33ade-701f-4731-9394-71346e4b6244`, then fill placeholders and approve running `scripts/data-fixes/T12-pd05-women-pink-rose.sql`.
- Commit: `065a59e`

### 2026-11-24 — T13 (SW-05, SW-06, SW-07, TX-04) — [~]

- Changed:
  - **SW-05**: Updated `apps/web/public/manifest.json` (`name`/`short_name` → `"Verndly"`), `apps/web/app/layout.tsx` (`apple-mobile-web-app-title` → `"Verndly"`), `apps/web/components/pwa/PwaInstallPrompt.tsx` (all user-facing copy & alt text → `Verndly`), `apps/web/public/sw.js` (`verndly-pwa-v3`), and `apps/web/app/dashboard/products/import/page.tsx` sample CSV brand → `Verndly`.
  - **SW-06**: Updated Footer Legal `"Payment Security"` in `apps/web/components/layout/Footer.tsx` from `/account/security` to public `/buyer-protection`.
  - **SW-07**: Hid public `"Pro Membership"` and auth-walled `"Seller Dashboard"` links in `apps/web/components/layout/Footer.tsx`, removed the auth-walled `"Pro features"` section from `apps/web/app/help/page.tsx`, and removed the unconfirmed Pro pricing entry from `apps/web/lib/content/faq.ts` pending owner confirmation of real Pro price and benefits.
  - **TX-04**: Added anchored public FAQ explainers (`#tracking-your-order`, `#seller-payouts`) in `apps/web/lib/content/faq.ts` and `apps/web/app/faq/page.tsx`; pointed all Help Center links in `apps/web/app/help/page.tsx` to public routes (no auth walls or 404s when signed out); updated `apps/web/app/orders/page.tsx` and `apps/web/components/auth/ProtectedRoute.tsx` to show `"Sign in to view your orders"` / `"Sign in to continue"` instead of an infinite loader or `"Checking access…"`.
- Verified:
  - `git grep -n "Vendly" apps/web/` — 0 user-facing matches.
  - `git grep -ni "Checking access" apps/web/` — 0 matches.
  - `pnpm --filter @vendly/web type-check` — 0 errors.
- NEEDS-HUMAN:
  - **SW-07**: Confirm the real Verndly Pro price and included benefits so we can publish a public `/pricing` page (and re-enable the footer/Help links pointing to `/pricing`).
- Commit: pending (see git log for `fix(t13): ... [sw-05, sw-06, sw-07, tx-04]`)
