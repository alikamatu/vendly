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
- Commit: pending (see git log for `fix(t02): ... [hm-01, ct-01, pd-01, pd-02]`)
