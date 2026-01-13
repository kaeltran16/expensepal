'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  BarChart3,
} from 'lucide-react'
import { InsightsCards } from '@/components/insights-cards'
import { SpendingAdvisor } from '@/components/spending-advisor'
import { WeeklySummary } from '@/components/weekly-summary'
import { InsightCardSkeleton, ChartSkeleton } from '@/components/skeleton-loader'
import { usePreprocessedExpenses } from '@/lib/hooks/use-preprocessed-expenses'
import {
  getComprehensiveInsights,
  analyzeCategoryTrends,
  type SpendingPattern,
  type CategoryTrend,
} from '@/lib/analytics/spending-insights'
import { getMerchantInsights, type MerchantInsight } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface InsightsViewProps {
  expenses: Expense[]
  loading: boolean
  onNavigate?: (view: 'budget' | 'analytics' | 'expenses') => void
}

type TabType = 'weekly' | 'insights'

export function InsightsView({ expenses, loading, onNavigate }: InsightsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('weekly')

  // Use preprocessed data for all insights (single-pass aggregation)
  const { data: preprocessed, isLoading: isPreprocessing } = usePreprocessedExpenses(expenses)

  // Derive insights from preprocessed data
  const patterns = useMemo<SpendingPattern[]>(
    () => (preprocessed ? getComprehensiveInsights(preprocessed) : []),
    [preprocessed]
  )

  const categoryTrends = useMemo<CategoryTrend[]>(
    () => (preprocessed ? analyzeCategoryTrends(preprocessed) : []),
    [preprocessed]
  )

  const merchantInsights = useMemo<MerchantInsight[]>(
    () => (preprocessed ? getMerchantInsights(preprocessed, 5) : []),
    [preprocessed]
  )

  if (loading || isPreprocessing) {
    return (
      <div className="space-y-4">
        {/* Segmented Control Skeleton */}
        <div className="ios-card p-1">
          <div className="grid grid-cols-2 gap-1">
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        <ChartSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Segmented Control */}
      <div className="ios-card p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('weekly')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'weekly'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Summary
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'insights'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Lightbulb className="h-4 w-4" />
            Insights
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'weekly' ? (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <WeeklySummary expenses={expenses} />
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Quick Insights Cards */}
            <InsightsCards expenses={expenses} />

            {/* Spending Patterns */}
            {patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="ios-headline px-1">Patterns & Streaks</h4>
                <div className="ios-list-group">
                  {patterns.slice(0, 3).map((pattern, index) => (
                    <PatternCard key={`${pattern.type}-${index}`} pattern={pattern} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Merchants - More prominent */}
            {merchantInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="ios-headline px-1">Top Spending</h4>
                <div className="ios-list-group">
                  {merchantInsights.slice(0, 3).map((merchant, index) => (
                    <CompactMerchantCard
                      key={merchant.merchant}
                      merchant={merchant}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category Trends - Simplified */}
            {categoryTrends.length > 0 && (
              <div className="space-y-2">
                <h4 className="ios-headline px-1">This Month vs Last Month</h4>
                <div className="ios-list-group">
                  {categoryTrends.slice(0, 3).map((trend, index) => (
                    <SimpleTrendCard key={trend.category} trend={trend} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* AI Advisor */}
            <SpendingAdvisor expenses={expenses} onNavigate={onNavigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PatternCard({ pattern, index }: { pattern: SpendingPattern; index: number }) {
  const Icon =
    pattern.impact === 'positive'
      ? Award
      : pattern.impact === 'negative'
        ? AlertTriangle
        : Lightbulb
  const bgColor =
    pattern.impact === 'positive'
      ? 'bg-green-100 dark:bg-green-900/20'
      : pattern.impact === 'negative'
        ? 'bg-red-100 dark:bg-red-900/20'
        : 'bg-blue-100 dark:bg-blue-900/20'
  const iconColor =
    pattern.impact === 'positive'
      ? 'text-green-600 dark:text-green-400'
      : pattern.impact === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-blue-600 dark:text-blue-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="ios-list-item"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="ios-headline mb-1">{pattern.title}</h4>
          <p className="ios-caption text-muted-foreground">{pattern.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Simplified trend card
function SimpleTrendCard({ trend, index }: { trend: CategoryTrend; index: number }) {
  const TrendIcon =
    trend.trend === 'up' ? TrendingUp : trend.trend === 'down' ? TrendingDown : Target
  const trendColor =
    trend.trend === 'up'
      ? 'text-red-500'
      : trend.trend === 'down'
        ? 'text-green-500'
        : 'text-muted-foreground'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-list-item"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <TrendIcon className={`h-5 w-5 ${trendColor} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <h4 className="ios-headline">{trend.category}</h4>
            <p className="ios-caption text-muted-foreground">
              {'\u20AB'}
              {(trend.currentMonth / 1000).toFixed(0)}k this month
            </p>
          </div>
        </div>
        <p className={`text-lg font-semibold ${trendColor}`}>
          {trend.changePercent > 0 ? '+' : ''}
          {trend.changePercent.toFixed(0)}%
        </p>
      </div>
    </motion.div>
  )
}

// Compact merchant card
function CompactMerchantCard({ merchant, index }: { merchant: MerchantInsight; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-list-item"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="ios-headline truncate">{merchant.merchant}</h4>
            <p className="ios-caption text-muted-foreground">
              {merchant.transactionCount} visits {'\u2022'} {'\u20AB'}
              {(merchant.averageAmount / 1000).toFixed(0)}k avg
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold">
              {'\u20AB'}
              {(merchant.totalSpent / 1000).toFixed(0)}k
            </p>
            <p className="ios-caption text-muted-foreground">
              {merchant.percentOfTotal.toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, merchant.percentOfTotal)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}
