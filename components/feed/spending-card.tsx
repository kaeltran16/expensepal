'use client'

import { motion } from 'motion/react'
import { springs, durations } from '@/lib/motion-system'
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { AnimatedCounter } from '@/components/animated-counter'

interface CategoryBreakdown {
  category: string
  total: number
}

interface SpendingCardProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  lastMonthTotal: number
  dailyAllowance: number | null
  budgetTotal: number
  topCategories: CategoryBreakdown[]
  currency: string
  annotation?: string | null
  onTap: () => void
}

const CURRENCY_LOCALES: Record<string, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SpendingCard({
  todayTotal,
  weekTotal,
  monthTotal,
  lastMonthTotal,
  dailyAllowance,
  budgetTotal,
  topCategories,
  currency,
  annotation,
  onTap,
}: SpendingCardProps) {
  const monthChange = lastMonthTotal > 0
    ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null
  const isDown = monthChange !== null && monthChange < 0
  const budgetUsedPct = budgetTotal > 0 ? Math.round((monthTotal / budgetTotal) * 100) : null
  const budgetOverflow = budgetTotal > 0 && monthTotal > budgetTotal
  const symbol = currency === 'VND' ? '' : '$'
  const suffix = currency === 'VND' ? 'đ' : ''

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card overflow-hidden text-left relative"
    >
      {/* Animated accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 bg-primary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: durations.slow }}
        style={{ transformOrigin: 'left' }}
      />

      {/* Background overlay */}
      <div className="absolute inset-0 bg-primary/[0.03] dark:bg-primary/[0.05] pointer-events-none" />

      <div className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today</p>
              {todayTotal > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                >
                  Active
                </motion.div>
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">Spending</p>
          </div>

          <motion.div
            className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-border/50 shadow-sm"
            whileTap={{ scale: 0.97 }}
          >
            <Wallet className="h-6 w-6 text-primary" />
          </motion.div>
        </div>

        {/* Hero amount */}
        <div className="mb-6">
          <p className="text-4xl font-black tracking-tight leading-none mb-1">
            <span className="text-xl font-bold text-muted-foreground mr-0.5">{symbol}</span>
            <AnimatedCounter
              value={todayTotal}
              duration={1200}
              locale={CURRENCY_LOCALES[currency] || 'en-US'}
            />
            {suffix && <span className="text-xl font-bold text-muted-foreground ml-0.5">{suffix}</span>}
          </p>
        </div>

        {/* Week + Month stat containers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Week</p>
              </div>
              <p className="text-lg font-bold tracking-tight tabular-nums">{formatAmount(weekTotal, currency)}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-accent" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Month</p>
              </div>
              <p className="text-lg font-bold tracking-tight tabular-nums">{formatAmount(monthTotal, currency)}</p>
            </div>
          </motion.div>
        </div>

        {/* Budget progress bar */}
        {budgetUsedPct !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget</p>
              <p className={`text-xs font-medium tabular-nums ${budgetOverflow ? 'text-destructive' : 'text-muted-foreground'}`}>
                {budgetUsedPct}%
              </p>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                transition={{ delay: 0.4, duration: 0.6 }}
              />
            </div>
          </div>
        )}

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {topCategories.slice(0, 3).map((cat) => (
              <span key={cat.category} className="tabular-nums">
                <span className="font-medium text-foreground/80">{cat.category || 'Other'}</span>{' '}
                {formatAmount(cat.total, currency)}
              </span>
            ))}
          </div>
        )}

        {/* AI annotation */}
        {annotation && (
          <p className="text-xs text-muted-foreground/80 italic mt-3">{annotation}</p>
        )}
      </div>

      {/* Budget pace footer */}
      {dailyAllowance !== null && (
        <div className="px-6 py-3 border-t border-border/30 relative z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              budgetOverflow ? 'bg-destructive' : dailyAllowance < 0 ? 'bg-warning' : 'bg-success'
            }`} />
            <p className="text-xs text-muted-foreground">
              {dailyAllowance >= 0 ? (
                <><span className="font-semibold">{formatAmount(dailyAllowance, currency)}</span>/day remaining</>
              ) : (
                <span className="text-destructive">Over by <span className="font-semibold">{formatAmount(Math.abs(dailyAllowance), currency)}</span>/day</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Trend footer */}
      {monthChange !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`px-6 py-3 border-t relative z-10 ${
            isDown ? 'border-success/20' : 'border-destructive/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDown ? 'bg-success/10' : 'bg-destructive/10'
              }`}>
                {isDown ? (
                  <TrendingDown className="h-4 w-4 text-success" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">vs Last Month</p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', bounce: 0.5 }}
              className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                isDown
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-destructive/20 text-destructive border border-destructive/30'
              }`}
            >
              {isDown ? '-' : '+'}{Math.abs(monthChange)}%
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.button>
  )
}
