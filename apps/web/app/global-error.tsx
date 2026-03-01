"use client";

import React from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-white flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="text-center max-w-xs w-full py-10 px-6 rounded-[2.5rem] bg-[#0c0c0c] border border-white/5 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-[60px] rounded-full"></div>
          
          <div className="relative">
            <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-md font-black tracking-tight mb-2 uppercase">Critical Error</h1>
            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              A major system failure occurred. Please refresh to restore the marketplace.
            </p>

            <button
               onClick={reset}
               className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-red-500/10"
            >
              <RefreshCcw className="w-4 h-4" />
              <span className="text-xs">Restore System</span>
            </button>
            
            {error.digest && (
              <p className="mt-6 text-[8px] font-mono text-slate-600 truncate opacity-50 uppercase tracking-widest">
                System Digest: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
