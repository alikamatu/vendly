import { Container } from '@/components';
import AuthTabs from '@/components/auth/auth-tabs';
import { ShoppingBag } from 'lucide-react';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <Container className="flex min-h-screen items-center justify-center py-8">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        {/* Left column: forms */}
        <div className="flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Join <span className="text-accent">Vendly</span>
            </h1>
            <p className="mt-2 text-foreground/60">
              Create your account and start selling on campus.
            </p>
          </div>

          <AuthTabs defaultTab="register" />
        </div>

        {/* Right column: image */}
        <div className="relative hidden md:block">
          <div className="sticky top-8 h-[700px] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-accent/20 to-accent/5">
            <div className="relative h-full w-full overflow-hidden rounded-2xl">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-3xl" />
              <Image
                src="/images/36121.jpg"
                alt="Vendly marketplace illustration"
                fill
                priority
                className="object-cover object-center"
              />
              <div className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl">
                <ShoppingBag size={26} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
