'use client'

import { useState, lazy, Suspense, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import {
  BarChart3,
  Lightbulb,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  Flame,
  Zap,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import { CategoryInsights } from '@/components/category-insights'
import { InsightsCards } from '@/components/insights-cards'
import { SpendingAdvisor } from '@/components/spending-advisor'
import { WeeklySummary } from '@/components/weekly-summary'
import { WeeklyNutritionSummary } from '@/components/weekly-nutrition-summary'
import { ChartSkeleton, InsightCardSkeleton } from '@/components/skeleton-loader'
import { hapticFeedback, formatCurrency } from '@/lib/utils'
import { springs, stagger } from '@/lib/animation-config'
import { usePreprocessedExpenses } from '@/lib/hooks/use-preprocessed-expenses'
import {
  getComprehensiveInsights,
  analyzeCategoryTrends,
  type SpendingPattern,
  type CategoryTrend,
} from '@/lib/analytics/spending-insights'
import { getMerchantInsights, type MerchantInsight } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase'

// Lazy load heavy Recharts component to reduce initial bundle size
const AnalyticsCharts = lazy(() =>
  import('@/components/analytics-charts').then((mod) => ({ default: mod.AnalyticsCharts }))
)

interface AnalyticsInsightsViewProps {
  expenses: Expense[]
  loading: boolean
  onNavigate?: (view: 'budget' | 'expenses' | 'insights') => void
}

type TabType = 'summary' | 'charts' | 'insights'

export function AnalyticsInsightsView({
  expenses,
  loading,
  onNavigate,
}: AnalyticsInsightsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    hapticFeedback('light')
  }

  if (loading || isPreprocessing) {
    return (
      <div className="space-y-6 pb-24">
        <TabSegmentedControl activeTab={activeTab} onTabChange={handleTabChange} />
        {activeTab === 'charts' ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <InsightCardSkeleton />
            <InsightCardSkeleton />
            <InsightCardSkeleton />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* iOS-style segmented control */}
      <TabSegmentedControl activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'summary' ? (
            <div className="space-y-4">
              <WeeklySummary expenses={expenses} />
              <WeeklyNutritionSummary />
            </div>
          ) : activeTab === 'charts' ? (
            <div className="space-y-4">
              <Suspense fallback={<ChartSkeleton />}>
                <AnalyticsCharts expenses={expenses} />
              </Suspense>
              <CategoryInsights expenses={expenses} />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Quick Insights Cards */}
              <InsightsCards expenses={expenses} onNavigate={onNavigate} />

              {/* Spending Patterns */}
              {patterns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...springs.gentle }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 px-1">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold">Patterns & Streaks</h4>
                  </div>
                  <Card className="divide-y divide-border/50 overflow-hidden">
                    {patterns.slice(0, 3).map((pattern, index) => (
                      <PatternCard key={`${pattern.type}-${index}`} pattern={pattern} index={index} />
                    ))}
                  </Card>
                </motion.div>
              )}

              {/* Top Merchants */}
              {merchantInsights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, ...springs.gentle }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 px-1">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Top Spending</h4>
                  </div>
                  <Card className="divide-y divide-border/50 overflow-hidden">
                    {merchantInsights.slice(0, 3).map((merchant, index) => (
                      <CompactMerchantCard
                        key={merchant.merchant}
                        merchant={merchant}
                        index={index}
                        maxAmount={merchantInsights[0]?.totalSpent || 1}
                      />
                    ))}
                  </Card>
                </motion.div>
              )}

              {/* Category Trends */}
              {categoryTrends.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, ...springs.gentle }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold">Monthly Comparison</h4>
                  </div>
                  <Card className="divide-y divide-border/50 overflow-hidden">
                    {categoryTrends.slice(0, 3).map((trend, index) => (
                      <SimpleTrendCard key={trend.category} trend={trend} index={index} />
                    ))}
                  </Card>
                </motion.div>
              )}

              {/* AI Advisor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, ...springs.gentle }}
              >
                <SpendingAdvisor expenses={expenses} onNavigate={onNavigate} />
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ios-style segmented control for tabs
function TabSegmentedControl({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}) {
  return (
    <div className="ios-card p-1.5">
      <div className="relative flex gap-1">
        {/* Summary tab */}
        <button
          onClick={() => onTabChange('summary')}
          className={`
            relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3
            rounded-xl transition-colors duration-200
            ${activeTab === 'summary' ? 'text-primary' : 'text-muted-foreground'}
          `}
        >
          {activeTab === 'summary' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-background rounded-xl shadow-sm"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <CalendarDays className="h-4 w-4 relative z-10" />
          <span className="text-sm font-medium relative z-10">Summary</span>
        </button>

        {/* Charts tab */}
        <button
          onClick={() => onTabChange('charts')}
          className={`
            relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3
            rounded-xl transition-colors duration-200
            ${activeTab === 'charts' ? 'text-primary' : 'text-muted-foreground'}
          `}
        >
          {activeTab === 'charts' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-background rounded-xl shadow-sm"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <BarChart3 className="h-4 w-4 relative z-10" />
          <span className="text-sm font-medium relative z-10">Charts</span>
        </button>

        {/* Insights tab */}
        <button
          onClick={() => onTabChange('insights')}
          className={`
            relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3
            rounded-xl transition-colors duration-200
            ${activeTab === 'insights' ? 'text-primary' : 'text-muted-foreground'}
          `}
        >
          {activeTab === 'insights' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-background rounded-xl shadow-sm"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <Lightbulb className="h-4 w-4 relative z-10" />
          <span className="text-sm font-medium relative z-10">Insights</span>
        </button>
      </div>
    </div>
  )
}

// Pattern card with enhanced visuals
function PatternCard({ pattern, index }: { pattern: SpendingPattern; index: number }) {
  const config = {
    positive: {
      icon: Award,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-800/40',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-l-green-500',
      gradient: 'from-green-500/10 to-transparent',
    },
    negative: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-800/40',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-l-red-500',
      gradient: 'from-red-500/10 to-transparent',
    },
    neutral: {
      icon: Lightbulb,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-800/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-l-blue-500',
      gradient: 'from-blue-500/10 to-transparent',
    },
  }

  const { icon: Icon, iconBg, iconColor, borderColor, gradient } = config[pattern.impact]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * stagger.normal, ...springs.default }}
      className={`relative p-4 border-l-4 ${borderColor} overflow-hidden`}
    >
      {/* Background gradient */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${gradient}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 + index * stagger.normal }}
      />

      <div className="relative flex items-start gap-3">
        <motion.div
          className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.35 + index * stagger.normal, ...springs.bouncy }}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{pattern.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{pattern.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Enhanced trend card with visual comparison
function SimpleTrendCard({ trend, index }: { trend: CategoryTrend; index: number }) {
  const isUp = trend.trend === 'up'
  const isDown = trend.trend === 'down'

  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Target

  const trendConfig = {
    up: {
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/30',
      barColor: 'bg-red-500',
    },
    down: {
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/30',
      barColor: 'bg-green-500',
    },
    stable: {
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      barColor: 'bg-muted-foreground',
    },
  }

  const config = trendConfig[trend.trend]

  // Calculate bar widths for visual comparison
  const maxAmount = Math.max(trend.currentMonth, trend.previousMonth, 1)
  const currentWidth = (trend.currentMonth / maxAmount) * 100
  const previousWidth = (trend.previousMonth / maxAmount) * 100

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * stagger.normal, ...springs.default }}
      className="p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{trend.category}</h4>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(trend.currentMonth, 'VND')} this month
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * stagger.normal, ...springs.bouncy }}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}
        >
          <TrendIcon className="w-3 h-3" />
          <span>
            {trend.changePercent > 0 ? '+' : ''}
            {trend.changePercent.toFixed(0)}%
          </span>
        </motion.div>
      </div>

      {/* Visual comparison bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">This mo.</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${config.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${currentWidth}%` }}
              transition={{ delay: 0.5 + index * stagger.normal, duration: 0.6 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-12">Last mo.</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-muted-foreground/40"
              initial={{ width: 0 }}
              animate={{ width: `${previousWidth}%` }}
              transition={{ delay: 0.55 + index * stagger.normal, duration: 0.6 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Enhanced merchant card with rank indicator
function CompactMerchantCard({
  merchant,
  index,
  maxAmount,
}: {
  merchant: MerchantInsight
  index: number
  maxAmount: number
}) {
  const percentage = (merchant.totalSpent / maxAmount) * 100

  const rankColors = [
    'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-amber-500/30',
    'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-gray-400/30',
    'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-orange-500/30',
  ]

  const barColors = [
    'bg-gradient-to-r from-yellow-400 to-amber-500',
    'bg-gradient-to-r from-gray-300 to-gray-400',
    'bg-gradient-to-r from-amber-600 to-orange-700',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 + index * stagger.normal, ...springs.default }}
      className="p-4"
    >
      <div className="flex items-center gap-3">
        {/* Rank badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4 + index * stagger.normal, ...springs.bouncy }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
            rankColors[index] || 'bg-muted text-muted-foreground'
          }`}
        >
          {index + 1}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="font-semibold text-sm truncate pr-2">{merchant.merchant}</h4>
            <span className="font-bold text-sm flex-shrink-0">
              {formatCurrency(merchant.totalSpent, 'VND')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${barColors[index] || 'bg-primary/60'}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ delay: 0.5 + index * stagger.normal, duration: 0.6 }}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-muted-foreground">
              {merchant.transactionCount} visits • ₫{(merchant.averageAmount / 1000).toFixed(0)}k avg
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">
              {merchant.percentOfTotal.toFixed(1)}% of total
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
