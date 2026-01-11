'use client'

import { useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Lightbulb, CalendarDays } from 'lucide-react'
import { CategoryInsights } from '@/components/category-insights'
import { InsightsCards } from '@/components/insights-cards'
import { SpendingAdvisor } from '@/components/spending-advisor'
import { WeeklySummary } from '@/components/weekly-summary'
import { ChartSkeleton, InsightCardSkeleton } from '@/components/skeleton-loader'
import { hapticFeedback } from '@/lib/utils'
import type { Expense } from '@/lib/supabase'

// Lazy load heavy Recharts component to reduce initial bundle size
const AnalyticsCharts = lazy(() => import('@/components/analytics-charts').then(mod => ({ default: mod.AnalyticsCharts })))
import {
  getComprehensiveInsights,
  analyzeCategoryTrends,
  type SpendingPattern,
  type CategoryTrend,
} from '@/lib/analytics/spending-insights'
import { getMerchantInsights, type MerchantInsight } from '@/lib/analytics/detect-recurring'
import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Award, AlertTriangle, Target } from 'lucide-react'

interface AnalyticsInsightsViewProps {
  expenses: Expense[]
  loading: boolean
  onNavigate?: (view: 'budget' | 'expenses') => void
}

type TabType = 'summary' | 'charts' | 'insights'

export function AnalyticsInsightsView({ expenses, loading, onNavigate }: AnalyticsInsightsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')

  // precompute insights data
  const patterns = useMemo(() => getComprehensiveInsights(expenses), [expenses])
  const categoryTrends = useMemo(() => analyzeCategoryTrends(expenses), [expenses])
  const merchantInsights = useMemo(() => getMerchantInsights(expenses, 5), [expenses])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    hapticFeedback('light')
  }

  if (loading) {
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
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'summary' ? (
          <WeeklySummary expenses={expenses} />
        ) : activeTab === 'charts' ? (
          <div className="space-y-4">
            <Suspense fallback={<ChartSkeleton />}>
              <AnalyticsCharts expenses={expenses} />
            </Suspense>
            <CategoryInsights expenses={expenses} />
          </div>
        ) : (
          <div className="space-y-4">
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

            {/* Top Merchants */}
            {merchantInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="ios-headline px-1">Top Spending</h4>
                <div className="ios-list-group">
                  {merchantInsights.slice(0, 3).map((merchant, index) => (
                    <CompactMerchantCard key={merchant.merchant} merchant={merchant} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Category Trends */}
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
          </div>
        )}
      </motion.div>
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

// helper components from insights view
function PatternCard({ pattern, index }: { pattern: SpendingPattern; index: number }) {
  const Icon = pattern.impact === 'positive' ? Award : pattern.impact === 'negative' ? AlertTriangle : Lightbulb
  const bgColor = pattern.impact === 'positive' ? 'bg-green-100 dark:bg-green-900/20' : pattern.impact === 'negative' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'
  const iconColor = pattern.impact === 'positive' ? 'text-green-600 dark:text-green-400' : pattern.impact === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="ios-list-item"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
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

function SimpleTrendCard({ trend, index }: { trend: CategoryTrend; index: number }) {
  const TrendIcon = trend.trend === 'up' ? TrendingUp : trend.trend === 'down' ? TrendingDown : Target
  const trendColor = trend.trend === 'up' ? 'text-red-500' : trend.trend === 'down' ? 'text-green-500' : 'text-muted-foreground'

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
              ₫{(trend.currentMonth / 1000).toFixed(0)}k this month
            </p>
          </div>
        </div>
        <p className={`text-lg font-semibold ${trendColor}`}>
          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(0)}%
        </p>
      </div>
    </motion.div>
  )
}

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
              {merchant.transactionCount} visits • ₫{(merchant.averageAmount / 1000).toFixed(0)}k avg
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold">₫{(merchant.totalSpent / 1000).toFixed(0)}k</p>
            <p className="ios-caption text-muted-foreground">{merchant.percentOfTotal.toFixed(0)}%</p>
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
