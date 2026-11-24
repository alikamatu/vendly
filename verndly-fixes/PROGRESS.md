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
- Commit: pending (see git log for `fix(t03): ... [st-01, st-02, pd-03]`)
