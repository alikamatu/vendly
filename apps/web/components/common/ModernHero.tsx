"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Button from "../ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import Container from "./Container";

export default function ModernHero() {
  const { user } = useAuth();

  // Only display if user is not a seller
  if (user?.role === "SELLER") return null;

  return (
    <section className="relative w-full pt-4 pb-12 md:pt-8 md:pb-24 overflow-hidden bg-background">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2.5rem] md:rounded-[4rem] bg-zinc-900 border border-white/5 shadow-2xl"
        >
          {/* Decorative Gradients */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] -z-10 -translate-x-1/4 translate-y-1/4" />

          <div className="relative z-10 px-6 py-16 md:px-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-[url('/images/45757.jpg')] bg-cover bg-bottom">
            {/* Left Side: Content */}
            <div className="space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-[10px] uppercase tracking-[0.18em] font-bold backdrop-blur-sm"
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified marketplace for modern businesses
              </motion.div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.95] text-white">
                  Sell smarter, <br />
                  <span className="text-primary">not harder.</span>
                </h1>
                <p className="text-base md:text-lg text-black max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  Tired of running your business in DMs? Vendly gives young
                  entrepreneurs and small businesses a premium storefront in
                  seconds — professional, fast, and built to grow.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
                <Link href="/seller-verification">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl px-10 border-none group shadow-xl shadow-primary/20"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/products" className="w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl text-white hover:bg-black border border-white/10 bg-black"
                  >
                    Browse Market
                  </Button>
                </Link>
              </div>

              {/* Social proof + trust signals */}
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
                  <p className="text-[11px] text-white font-bold">
                    <span className="text-primary">1,000+</span> entrepreneurs trust Vendly
                  </p>
                </div>
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-white">
                  {[
                    { text: "Live in 60 seconds", icon: Zap },
                    { text: "Paystack secured", icon: ShieldCheck },
                    { text: "0% setup fee", icon: ArrowRight },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Minimal Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="hidden lg:block relative"
            >
              <div className="relative w-full aspect-square max-w-[440px] ml-auto">
                {/* Visual Card 1 — premium storefront */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-0 right-0 w-64 p-6 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-xl shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      ● Live
                    </span>
                  </div>
                  <h3 className="text-white text-sm font-extrabold uppercase tracking-tight">
                    Storefront ready in seconds
                  </h3>
                  <p className="text-white/70 text-[11px] mt-2 leading-relaxed">
                    Branded shop, custom URL, mobile-first checkout. No code, no plugins.
                  </p>
                </motion.div>

                {/* Visual Card 2 — sales dashboard preview */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute bottom-4 left-0 w-64 p-6 rounded-3xl bg-primary shadow-2xl shadow-primary/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-black/15 flex items-center justify-center text-white">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
                      Today
                    </span>
                  </div>
                  <h3 className="text-white text-sm font-extrabold uppercase tracking-tight">
                    GH₵12,480 in sales
                  </h3>
                  <p className="text-white/85 text-[11px] mt-2 leading-relaxed">
                    +24% vs last week. Real-time analytics built for ambitious operators.
                  </p>
                </motion.div>

                {/* Ambient glow behind cards */}
                <div className="absolute inset-0 bg-primary/5 blur-[80px] -z-10 rounded-full" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
