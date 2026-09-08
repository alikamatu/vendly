import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const disallowedPaths = [
    "/dashboard",
    "/dashboard/",
    "/cart",
    "/checkout",
    "/orders",
    "/orders/",
    "/account",
    "/account/",
    "/onboarding",
    "/api/",
    "/auth/callback",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths,
      },
      // Explicit allowance for AI Search & Answer Engine Bots (AEO)
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Google-Extended",
          "Applebot",
          "Amazonbot",
          "Bingbot",
        ],
        allow: [
          "/",
          "/products",
          "/product/",
          "/stores",
          "/s/",
          "/categories",
          "/returns",
          "/faq",
          "/shipping",
          "/about",
        ],
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
