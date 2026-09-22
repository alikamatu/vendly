import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { OperationsProvider } from '@/contexts/OperationsContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Vendly Admin',
    template: '%s — Vendly Admin',
  },
  description:
    'Administrative dashboard for the Vendly marketplace — manage users, transactions, approvals, and platform operations.',
  keywords: ['vendly', 'admin', 'dashboard', 'marketplace', 'management'],
  icons: {
    icon: '/logos/verndly.png',
    shortcut: '/logos/verndly.png',
    apple: '/logos/verndly.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full`} suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-full flex-col antialiased">
        <ThemeProvider>
          <AuthProvider>
            <OperationsProvider>
              <ToastProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
              </ToastProvider>
            </OperationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
