import React from "react";

/**
 * Renders a JSON-LD script tag for structured data. Use this wherever a
 * specific schema applies (Product, BreadcrumbList, LocalBusiness, etc.).
 *
 * The `data` object goes through JSON.stringify with `<` / `>` escaped so the
 * script can't break out — Next 16's React 19 also strips dangerous chars,
 * but defence in depth is cheap.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | unknown[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
