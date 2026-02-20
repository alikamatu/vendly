export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="min-h-screen flex flex-col">{children}</main>
    </>
  );
}