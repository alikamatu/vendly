# TASKS — Verndly Fix Queue

Source: Verndly site fix list, audited 23 Nov 2026 (39 items: 17 P0 · 12 P1 · 10 P2).
Order is the execution order. Take the first `[ ]` row.

| #   | Status | Task file                                | Highest priority | Items                             |
| --- | ------ | ---------------------------------------- | ---------------- | --------------------------------- |
| T01 | [x]    | tasks/T01-contact-and-schema.md          | P0               | SW-01, SW-02                      |
| T02 | [~]    | tasks/T02-brand-rail-apple-nike.md       | P0               | HM-01, CT-01, PD-01, PD-02        |
| T03 | [~]    | tasks/T03-catalog-data-hoodies.md        | P0               | ST-01, ST-02, PD-03               |
| T04 | [x]    | tasks/T04-rejected-listing-moderation.md | P0               | ST-03                             |
| T05 | [x]    | tasks/T05-about-page.md                  | P0               | AB-01, AB-02                      |
| T06 | [x]    | tasks/T06-faq-schema.md                  | P0               | FQ-01, FQ-02                      |
| T07 | [x]    | tasks/T07-jumia-calculator-and-blog.md   | P0               | SL-01, BL-01                      |
| T08 | [x]    | tasks/T08-coverage-claims.md             | P0               | HM-02, SW-04, SL-02, AB-03, SH-01 |
| T09 | [~]    | tasks/T09-homepage-rails.md              | P1               | HM-03, HM-04, PD-04               |
| T10 | [~]    | tasks/T10-escrow-and-fee-copy.md         | P1               | SW-03, SL-03                      |
| T11 | [x]    | tasks/T11-categories-empty.md            | P1               | CT-02                             |
| T12 | [ ]    | tasks/T12-product-page-quality.md        | P1               | PD-05, PD-06                      |
| T13 | [ ]    | tasks/T13-pwa-footer-help-links.md       | P2               | SW-05, SW-06, SW-07, TX-04        |
| T14 | [ ]    | tasks/T14-store-and-listing-polish.md    | P2               | ST-04, PD-08                      |
| T15 | [ ]    | tasks/T15-seo-technical.md               | P2               | PD-07, TX-01, TX-02, TX-03        |

Coverage check: 2+4+3+1+2+2+2+5+3+2+1+2+4+2+4 = **39 items**.

## Dependencies worth knowing

- T02 and T03 clear the bad product records; T11 (empty categories) depends on T03 (African Dress recategorized).
- T09 and T04 both rely on a shared rule: only **approved, in-stock** items appear in rails/sitemaps. Build it once in T04 and reuse it in T09 and T15.
- T08 and T10 define the new delivery/escrow wording; reuse the same sentences everywhere instead of rewriting.
