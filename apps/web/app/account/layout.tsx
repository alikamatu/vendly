import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Header />
      <main className="flex-1 py-8 px-4">
        {children}
      </main>
      <Footer />
    </div>
  );
}
