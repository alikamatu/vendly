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
- Commit: pending (see git log for `fix(t01): ... [sw-01, sw-02]`)
