'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

interface SpendingCardProps {
  todayTotal: number
  weekTotal: number
  monthTotal: number
  lastMonthTotal: number
  dailyAllowance: number | null
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
  currency,
  annotation,
  onTap,
}: SpendingCardProps) {
  const monthChange = lastMonthTotal > 0
    ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null
  const isDown = monthChange !== null && monthChange < 0

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Spending</span>
        {monthChange !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs font-medium ${isDown ? 'text-emerald-600' : 'text-red-500'}`}>
            {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {Math.abs(monthChange)}% vs last month
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(todayTotal, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Week</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(weekTotal, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Month</p>
          <p className="text-base font-semibold tabular-nums">{formatAmount(monthTotal, currency)}</p>
        </div>
      </div>

      {/* Budget pace */}
      {dailyAllowance !== null && (
        <p className="text-xs text-muted-foreground mb-2">
          {dailyAllowance >= 0 ? (
            <>Daily allowance: <span className="font-medium text-foreground">{formatAmount(dailyAllowance, currency)}</span></>
          ) : (
            <>Over budget by: <span className="font-medium text-red-500">{formatAmount(Math.abs(dailyAllowance), currency)}</span>/day</>
          )}
        </p>
      )}

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
      )}
    </motion.button>
  )
}
