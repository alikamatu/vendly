"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm p-8 sm:p-12 rounded-3xl bg-[--color-surface]"
      >
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[--color-primary]/10 mb-6">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[--color-foreground] tracking-tight">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-[--color-foreground]/50">
            Sign in to your dashboard
          </p>
        </div>

        <LoginForm />

        <div className="mt-12 text-center text-[10px] text-[--color-foreground]/30 uppercase tracking-widest">
          Secure Access Only
        </div>
      </motion.div>

      {/* Subtle background element */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute top-0 right-0 h-[50vh] w-[50vw] rounded-full opacity-[0.03] blur-[120px]"
          style={{ background: "var(--color-primary)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-[50vh] w-[50vw] rounded-full opacity-[0.02] blur-[120px]"
          style={{ background: "var(--color-accent)" }}
        />
      </div>
    </div>
  );
}
