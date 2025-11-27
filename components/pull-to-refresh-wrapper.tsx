'use client'

import { usePullToRefresh } from '@/lib/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { ReactNode, useRef } from 'react';

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
  maxDistance?: number;
  className?: string;
}

export function PullToRefreshWrapper({
  children,
  onRefresh,
  enabled = true,
  threshold = 70,
  maxDistance = 100,
  className = '',
}: PullToRefreshWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({
    onRefresh,
    enabled,
    threshold,
    maxDistance,
  });

  return (
    <div className={`relative ${className}`}>
      {/* Pull to refresh indicator - Enhanced iOS style */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: Math.min(pullDistance / threshold, 1),
              y: Math.min(pullDistance / 3, 30),
              scale: pullDistance > threshold ? 1.1 : 1,
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-16 left-0 right-0 flex justify-center z-40 pointer-events-none"
          >
            <motion.div
              className="bg-card/90 backdrop-blur-xl rounded-full p-3 shadow-lg border border-border/50"
              animate={{
                boxShadow: pullDistance > threshold
                  ? '0 10px 40px -10px rgba(0, 122, 255, 0.3)'
                  : '0 4px 12px -4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : pullDistance * 3 }}
                transition={{
                  duration: isRefreshing ? 1 : 0.2,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: isRefreshing ? 'linear' : 'easeOut',
                }}
              >
                <RefreshCw
                  className={`h-5 w-5 transition-colors ${
                    pullDistance > threshold ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content wrapper with touch handlers */}
      <div
        ref={contentRef}
        onTouchStart={(e) => handleTouchStart(e, contentRef)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
