import React from "react";
import JsonLd from "./JsonLd";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/seo";

/**
 * Site-wide Organization + WebSite schemas. WebSite includes a
 * SearchAction so Google can surface a sitelinks search box on the SERP.
 */
export default function OrganizationJsonLd() {
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/logos/vendly.png`,
          description: SITE_DESCRIPTION,
          sameAs: [],
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        },
      ]}
    />
  );
}
