"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Loading() {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-12">
      {/* Header Skeleton */}
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-4 w-32 bg-border/20 rounded-full animate-pulse" />
        <div className="h-10 w-64 bg-border/20 rounded-2xl animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="max-w-7xl mx-auto columns-2 md:columns-3 lg:columns-4 gap-6">
        {skeletons.map((_, i) => (
          <div key={i} className="break-inside-avoid mb-6">
            <div className={`rounded-[2.5rem] bg-border/10 border border-border/20 overflow-hidden flex flex-col`}>
              {/* Image Skeleton */}
              <div 
                className="w-full bg-border/20 animate-pulse relative overflow-hidden"
                style={{ height: `${[250, 350, 400, 300][i % 4]}px` }}
              >
                 {/* Shimmer effect */}
                 <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                 />
              </div>

              {/* Text Skeletons */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-3/4 bg-border/20 rounded-lg animate-pulse" />
                  <div className="h-3 w-1/4 bg-border/20 rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-border/20 animate-pulse" />
                  <div className="h-2 w-20 bg-border/20 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
