"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full"></div>
        <div className="relative bg-surface border border-border/50 p-8 rounded-[2.5rem] shadow-2xl">
          <Search className="w-12 h-12 text-primary mx-auto mb-4 opacity-20" />
          <h1 className="text-md font-black tracking-tight text-foreground uppercase">404</h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-xs mx-auto"
      >
        <h2 className="text-md font-bold text-foreground">Lost in the marketplace?</h2>
        <p className="text-xs text-muted leading-relaxed font-medium">
          The page you're looking for doesn't exist or has been moved to a different stall.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <Link href="/" className="flex-1">
          <Button variant="primary" size="md" className="w-full rounded-2xl gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
        <button 
          onClick={() => window.history.back()}
          className="flex-1 px-6 py-3.5 text-xs font-bold text-muted hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </motion.div>
    </div>
  );
}
