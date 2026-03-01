"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

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
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
          <h1 className="text-md font-black tracking-tight text-foreground uppercase">Oops!</h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-xs mx-auto"
      >
        <h2 className="text-md font-bold text-foreground">Something went wrong</h2>
        <p className="text-xs text-muted leading-relaxed font-medium">
          Vendly encountered an unexpected error. Don't worry, your data is safe.
        </p>
        {error.digest && (
           <p className="text-[10px] font-mono text-muted/50 bg-border/20 py-1 rounded-md px-2 truncate">
              ID: {error.digest}
           </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <Button 
          variant="primary" 
          size="md" 
          className="flex-1 rounded-2xl gap-2 h-14"
          onClick={reset}
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </Button>
        <Link href="/" className="flex-1">
          <Button variant="secondary" size="md" className="w-full rounded-2xl gap-2 h-14">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
