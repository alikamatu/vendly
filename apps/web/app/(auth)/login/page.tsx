'use client';

import { Container } from '@/components';
import AuthTabs from '@/components/auth/auth-tabs';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md p-8 sm:p-12 md:p-14 rounded-3xl bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-transparent"
      >
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Continue to <span className="font-medium text-accent">Vendly</span>
          </p>
        </div>

        <AuthTabs />
        
        <div className="mt-12 text-center">
          <p className="text-xs text-foreground/30">
            &copy; {new Date().getFullYear()} Vendly. Built for campus life.
          </p>
        </div>
      </motion.div>
    </div>
  );
}