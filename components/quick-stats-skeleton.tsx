'use client'

import { motion } from 'framer-motion';

export function QuickStatsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card overflow-hidden"
    >
      <div className="p-6 relative">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
        </div>

        {/* Amount skeleton - matches text-5xl height */}
        <div className="mb-6">
          <div className="h-[60px] w-48 bg-muted rounded-2xl animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 h-[68px] animate-pulse" />
          <div className="bg-muted/50 rounded-xl p-3 h-[68px] animate-pulse" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div
        className="px-6 py-3 border-t border-border/30"
      >
        <div className="h-4 w-32 bg-muted rounded-full animate-pulse" />
      </div>
    </motion.div>
  );
}
