/**
 * SEO helpers. Single source of truth for the canonical site URL and
 * shared metadata builders. Override the URL in production by setting
 * `NEXT_PUBLIC_SITE_URL`.
 */
import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://verndly.com"
).replace(/\/$/, "");

export const SITE_NAME = "Verndly";

export const SITE_DESCRIPTION =
  "Discover and shop from trusted, verified independent businesses and young entrepreneurs — all in one place.";

/**
 * Default OG image is generated dynamically by `app/opengraph-image.tsx`.
 * Next auto-references it as `${SITE_URL}/opengraph-image` — but to make
 * Twitter cards explicit, we point at the same dynamic route.
 */
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Build a Next.js `Metadata` object for any page. Inherits sensible
 * Open Graph / Twitter defaults and lets callers override per-field.
 */
export function buildMetadata(opts: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article" | "product";
  keywords?: string[];
}): Metadata {
  const url = opts.path ? absoluteUrl(opts.path) : SITE_URL;
  const image = opts.image || DEFAULT_OG_IMAGE;
  const description = opts.description || SITE_DESCRIPTION;
  return {
    title: opts.title,
    description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    robots: opts.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: (opts.type === "product" ? "website" : opts.type) || "website",
      title: opts.title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description,
      images: [image],
    },
  };
}
