import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Header />
      <main className="flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
