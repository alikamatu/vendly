import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "../lib/contexts/theme";
import { AuthProvider } from "../lib/contexts/auth-context";
import { CartProvider } from "../lib/contexts/cart-context";
import { StoreGuard } from "../components/auth/store-guard";
import { AuthModalProvider } from "../lib/contexts/auth-modal-context";
import AuthModal from "../components/auth/AuthModal";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, buildMetadata } from "@/lib/seo";
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Marketplace for Independent Businesses`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Verndly",
    "marketplace",
    "Ghana marketplace",
    "young entrepreneurs",
    "small business",
    "independent sellers",
    "online shopping Ghana",
    "buy from local stores",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  // Ownership verification tokens. Set these in the Vercel project env so you
  // can verify the domain in Google Search Console / Bing Webmaster Tools and
  // submit the sitemap. Empty in dev → Next omits the tags entirely.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {},
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Marketplace for Independent Businesses`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Marketplace for Independent Businesses`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
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
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

import { FavoriteProvider } from "../lib/contexts/favorite-context";
import SiteFooter from "../components/layout/SiteFooter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          Eager TCP + TLS handshakes for the two origins every page hits:
          Cloudinary (every product image) and the API. preconnect opens the
          socket; dns-prefetch is a cheap fallback for browsers that ignore
          preconnect under hint pressure.
        */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {process.env.NEXT_PUBLIC_API_URL && (
          <>
            <link
              rel="preconnect"
              href={process.env.NEXT_PUBLIC_API_URL}
              crossOrigin=""
            />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL} />
          </>
        )}
        {/* Hero image — biggest paint on the home page. Preload so it lands
            before React mounts. */}
        <link
          rel="preload"
          as="image"
          href="/images/423323.jpeg"
          fetchPriority="high"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OrganizationJsonLd />
        <ThemeProvider>
          <AuthProvider>
            <AuthModalProvider>
              <FavoriteProvider>
                <CartProvider>
                  <StoreGuard>
                    {children}
                    <SiteFooter />
                    <AuthModal />
                  </StoreGuard>
                </CartProvider>
              </FavoriteProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
