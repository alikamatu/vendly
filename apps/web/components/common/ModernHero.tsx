"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Button from "../ui/Button";
import { useAuth } from "@/lib/auth-context";
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

          <div className="relative z-10 px-6 py-16 md:px-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Content */}
            <div className="space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] uppercase tracking-widest"
              >
                <Sparkles size={14} className="text-primary" />
                The Future of Verified Entrepreneurship
              </motion.div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.95] text-white">
                  Sell smarter, <br />
                  <span className="text-primary">not harder.</span>
                </h1>
                <p className="text-base md:text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  Tired of managing sales in DMs? Vendly gives you a premium
                  store in seconds. Professional, fast, and built for verified
                  entrepreneurs.
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
                <Link href="/products">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl text-white/80 hover:text-white hover:bg-white/5 border border-white/10"
                  >
                    Browse Market
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-8">
                {[
                  { text: "Fast Setup", icon: Zap },
                  { text: "Secure Payments", icon: ShieldCheck },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-zinc-500"
                  >
                    <item.icon className="w-4 h-4 text-primary/60" />
                    <span className="text-[9px] uppercase tracking-[0.15em]">
                      {item.text}
                    </span>
                  </div>
                ))}
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
                {/* Visual Card 1 */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-0 right-0 w-64 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-white text-sm uppercase tracking-wider">
                    Instant Setup
                  </h3>
                  <p className="text-zinc-500 text-[10px] mt-2 leading-relaxed">
                    Your store is live the moment you sign up. No technical
                    skills required.
                  </p>
                </motion.div>

                {/* Visual Card 2 */}
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
                  <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center text-white mb-4">
                    <ArrowRight size={24} />
                  </div>
                  <h3 className="text-white text-sm uppercase tracking-wider">
                    Zero Fees
                  </h3>
                  <p className="text-white/70 text-[10px] mt-2 leading-relaxed">
                    Start selling for free. We only grow when you grow. Built
                    for the modern entrepreneur economy.
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
