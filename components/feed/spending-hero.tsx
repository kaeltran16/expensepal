'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Wallet, Activity } from 'lucide-react'
import { AnimatedCounter } from '@/components/animated-counter'

interface SpendingHeroProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  budgetTotal: number
  currency: string
  onTap: () => void
}

const CURRENCY_LOCALES: Record<string, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SpendingHero({
  todayTotal,
  weekTotal,
  monthTotal,
  budgetTotal,
  currency,
  onTap,
}: SpendingHeroProps) {
  const symbol = currency === 'VND' ? '' : '$'
  const suffix = currency === 'VND' ? 'đ' : ''
  const budgetUsedPct = budgetTotal > 0 ? Math.round((monthTotal / budgetTotal) * 100) : null
  const budgetOverflow = budgetTotal > 0 && monthTotal > budgetTotal

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.touch}
      className="w-full ios-card overflow-hidden text-left"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Today&apos;s Spending</p>
            <p className="text-4xl font-black tracking-tight leading-none">
              <span className="text-xl font-bold text-muted-foreground mr-0.5">{symbol}</span>
              <AnimatedCounter
                value={todayTotal}
                duration={1200}
                locale={CURRENCY_LOCALES[currency] ?? 'en-US'}
              />
              {suffix && <span className="text-xl font-bold text-muted-foreground ml-0.5">{suffix}</span>}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Week + Month */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This Week</p>
            </div>
            <p className="text-lg font-bold tracking-tight tabular-nums">{formatAmount(weekTotal, currency)}</p>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="h-3.5 w-3.5 text-accent" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This Month</p>
            </div>
            <p className="text-lg font-bold tracking-tight tabular-nums">{formatAmount(monthTotal, currency)}</p>
          </div>
        </div>

        {/* Budget bar */}
        {budgetUsedPct !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget</p>
              <p className={`text-[11px] font-semibold tabular-nums ${budgetOverflow ? 'text-destructive' : 'text-muted-foreground'}`}>
                {budgetUsedPct}%
              </p>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${budgetOverflow ? 'bg-destructive' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.button>
  )
}
