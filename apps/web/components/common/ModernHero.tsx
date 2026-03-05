"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, MessageSquare, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Button from "../ui/Button";
import { useAuth } from "@/lib/auth-context";
import clsx from "@/utils/clsx";

export default function ModernHero() {
  const { user } = useAuth();

  // Only display if user is not a seller
  if (user?.role === "SELLER") return null;

  const bubbles = [
    { text: "I want a vintage bag", color: "bg-primary text-white", x: -20, y: -40, delay: 0 },
    { text: "Check my shop link!", color: "bg-surface border border-border text-foreground", x: 40, y: 20, delay: 0.5 },
    { text: "Available for delivery?", color: "bg-primary text-white", x: -30, y: 80, delay: 1 },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-background py-20 lg:py-48 border-b border-border min-h-[80vh] flex items-center">
      {/* Background Wallpaper with Entrance Animation */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <img 
          src="/background.svg" 
          alt="" 
          className="w-full h-full object-cover opacity-100 grayscale-[0.1]"
        />
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Side: Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 relative z-10"
        >
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-foreground">
              Stop losing sales <br />
              <span className="text-primary italic">in the DMs.</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-lg leading-relaxed">
              Every day you sell through WhatsApp DMs, you lose money to dropped networks, forgotten orders, and buyers who never come back. Vendly gives you a real store in 5 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-none group">
                Create my free store
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto shadow-none">
              See how it works ↓
            </Button>
          </div>

          {/* Benefits Grid - Simplified */}
          <div className="grid grid-cols-2 gap-6 pt-6 pt-8 border-t border-border/50">
            {[
              { text: "No credit card needed", icon: CheckCircle2 },
              { text: "Live in 5 minutes", icon: CheckCircle2 },
              { text: "MoMo & card payments", icon: CheckCircle2 },
              { text: "WhatsApp alerts", icon: CheckCircle2 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Floating Bubbles (Mockup Image Removed) */}
        <div className="relative h-[300px] lg:h-[400px]">
          {/* Request Bubbles */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {bubbles.map((bubble, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, x: bubble.x + (i % 2 === 0 ? -20 : 20) }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: (i * 40) - 20, // Simplified distribution without the mockup base
                  y: [bubble.y, bubble.y - 10, bubble.y]
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: bubble.delay + 0.5 },
                  scale: { duration: 0.5, delay: bubble.delay + 0.5 },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className={`absolute p-4 rounded-2xl shadow-xl text-[11px] font-black uppercase tracking-wider relative ${bubble.color}`}
                style={{ 
                  left: `50%`, 
                  top: `calc(50% + ${bubble.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center gap-2 relative z-10">
                  {i % 2 === 0 ? <MessageSquare className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                  {bubble.text}
                </div>
                {/* Chat Bubble Tail */}
                <div className={clsx(
                  "absolute bottom-[-6px] w-3 h-3 rotate-45 z-0",
                  i % 2 === 0 ? "bg-primary left-4" : "bg-surface border-r border-b border-border right-4"
                )} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
