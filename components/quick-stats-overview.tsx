'use client'

import { AnimatedCounter } from '@/components/animated-counter';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Wallet, Calendar, Activity, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import { useMemo } from 'react';

interface QuickStatsOverviewProps {
  todayTotal: number;
  todayCount: number;
  weekTotal: number;
  monthTotal: number;
  lastMonthTotal?: number;
}

export function QuickStatsOverview({
  todayTotal,
  todayCount,
  weekTotal,
  monthTotal,
  lastMonthTotal = 0,
}: QuickStatsOverviewProps) {
  const monthChange = useMemo(() => {
    if (!lastMonthTotal) return 0;
    return ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [monthTotal, lastMonthTotal]);

  const isIncreasing = monthChange > 0;
  const hasSpentToday = todayTotal > 0;

  return (
    <div className="space-y-3">
      {/* Main Today Card with Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="ios-card overflow-hidden relative group"
      >

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Today
                </p>
                {hasSpentToday && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  >
                    <Sparkles className="h-2 w-2" />
                    Active
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'}
              </p>
            </div>

            {/* Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-border/50 shadow-sm">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
            </motion.div>
          </div>

          {/* Main Amount - Larger and More Prominent */}
          <div className="mb-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <p className="text-6xl font-black tracking-tighter leading-none mb-1">
                <AnimatedCounter value={todayTotal} prefix="₫ " duration={1200} />
              </p>
              {hasSpentToday && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive/80 font-medium flex items-center gap-1"
                >
                  <ArrowDown className="h-3 w-3" />
                  Spent today
                </motion.p>
              )}
            </motion.div>
          </div>

          {/* Stats Grid - Enhanced Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* This Week */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    This Week
                  </p>
                </div>
                <p className="text-xl font-bold tracking-tight">
                  ₫ {weekTotal.toLocaleString()}
                </p>
              </div>
            </motion.div>

            {/* This Month */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    This Month
                  </p>
                </div>
                <p className="text-xl font-bold tracking-tight">
                  ₫ {monthTotal.toLocaleString()}
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Trend Footer */}
        {lastMonthTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`px-6 py-3.5 border-t ${
              isIncreasing
                ? 'border-destructive/20'
                : 'border-green-500/20'
            }`}
          >

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isIncreasing
                    ? 'bg-destructive/10'
                    : 'bg-green-500/10'
                }`}>
                  {isIncreasing ? (
                    <TrendingUp className="h-4.5 w-4.5 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4.5 w-4.5 text-green-600 dark:text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">vs Last Month</p>
                  <p className={`text-sm font-bold ${
                    isIncreasing ? 'text-destructive' : 'text-green-600 dark:text-green-500'
                  }`}>
                    {isIncreasing ? '+' : '-'}{Math.abs(monthChange).toFixed(1)}%
                    {isIncreasing ? ' more' : ' less'}
                  </p>
                </div>
              </div>

              {/* Change indicator badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', bounce: 0.5 }}
                className={`px-3 py-1.5 rounded-full font-bold text-xs ${
                  isIncreasing
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'
                }`}
              >
                {isIncreasing ? '📈 Higher' : '📉 Lower'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
