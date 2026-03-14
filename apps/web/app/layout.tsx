import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "../lib/theme";
import { AuthProvider } from "../lib/auth-context";
import { CartProvider } from "../lib/cart-context";
import { StoreGuard } from "../components/auth/store-guard";

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
  description: "Discover and shop from trusted, verified entrepreneurs all in one place.",
};

import { FavoriteProvider } from "../lib/favorite-context";

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
            <FavoriteProvider>
              <CartProvider>
                <StoreGuard>
                  {children}
                </StoreGuard>
              </CartProvider>
            </FavoriteProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
