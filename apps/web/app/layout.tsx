import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "../lib/contexts/theme";
import { AuthProvider } from "../lib/contexts/auth-context";
import { CartProvider } from "../lib/contexts/cart-context";
import { StoreGuard } from "../components/auth/store-guard";
import { AuthModalProvider } from "../lib/contexts/auth-modal-context";
import AuthModal from "../components/auth/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vendly — Marketplace for Verified Entrepreneurs",
  description:
    "Discover and shop from trusted, verified entrepreneurs all in one place.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
