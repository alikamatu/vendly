'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Button from '../ui/Button';
import { useAuth } from '@/lib/contexts/auth-context';
import Container from './Container';

export default function ModernHero() {
  const { user } = useAuth();

  // Only display if user is not a seller
  if (user?.role === 'SELLER') return null;

  return (
    <section className="bg-background relative w-full overflow-hidden pb-12 pt-4 md:pb-24 md:pt-8">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 md:rounded-[4rem]"
        >
          {/* Decorative Gradients */}
          <div className="bg-primary/20 absolute right-0 top-0 -z-10 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 blur-[120px]" />
          <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 bg-blue-500/10 blur-[100px]" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-12 bg-[url('/images/423323.jpeg')] bg-cover bg-bottom px-6 py-16 md:px-16 md:py-24 lg:grid-cols-2">
            {/* Left Side: Content */}
            <div className="space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-black backdrop-blur-sm"
              >
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Verified marketplace for modern businesses
              </motion.div>

              <div className="space-y-5">
                <h1 className="text-4xl leading-[1.05] tracking-tight text-black md:text-5xl lg:text-6xl">
                  Sell smarter,
                  <br />
                  <span className="text-primary">not harder.</span>
                </h1>
                <p className="mx-auto max-w-lg text-base leading-relaxed text-black/80 md:text-lg lg:mx-0">
                  Tired of running your business in DMs? Vendly gives young entrepreneurs and small
                  businesses a premium storefront in seconds — professional, fast, and built to
                  grow.
                </p>
              </div>

              <div className="flex flex-col justify-center gap-3 pt-1 sm:flex-row lg:justify-start">
                <Link href="/seller-verification">
                  <Button
                    variant="primary"
                    size="lg"
                    className="shadow-primary/20 group w-full rounded-xl border-none px-8 shadow-xl sm:w-auto"
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/products" className="w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full rounded-xl border border-white/15 bg-black text-white hover:bg-white/10 sm:w-auto"
                  >
                    Browse market
                  </Button>
                </Link>
              </div>

              {/* Social proof + trust signals
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="flex -space-x-2">
                    {["bg-amber-400", "bg-rose-400", "bg-emerald-400", "bg-sky-400"].map(
                      (c, i) => (
                        <div
                          key={i}
                          className={`w-7 h-7 rounded-full border-2 border-black ${c}`}
                        />
                      ),
                    )}
                  </div>
                  <p className="text-[11px] text-black font-normal">
                    <span className="text-primary">1,000+</span> entrepreneurs trust Vendly
                  </p>
                </div>
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-black/80">
                  {[
                    { text: "Live in 60 seconds", icon: Zap },
                    { text: "Paystack secured", icon: ShieldCheck },
                    { text: "0% setup fee", icon: ArrowRight },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>

            {/* Right Side: Minimal Visual */}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
