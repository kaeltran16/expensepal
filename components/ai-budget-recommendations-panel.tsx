'use client'

import { Button } from '@/components/ui/button'
import { BudgetRecommendations } from '@/components/budget-recommendations'
import { useAIBudgetRecommendations, useCreateBudget, useUpdateBudget } from '@/lib/hooks/use-budgets'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface AIBudgetRecommendationsPanelProps {
  onSetBudget?: (category: string, suggestedAmount: number) => void
}

export function AIBudgetRecommendationsPanel({ onSetBudget }: AIBudgetRecommendationsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [monthsOfHistory, setMonthsOfHistory] = useState(12)
  const [isEnabled, setIsEnabled] = useState(false)

  const { data, isLoading, error, refetch } = useAIBudgetRecommendations(
    { months: monthsOfHistory, includeBasic: true },
    { enabled: isEnabled, staleTime: 1000 * 60 * 60 * 24 } // 24 hours cache
  )

  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()

  const handleAcceptRecommendation = async (category: string, amount: number) => {
    if (onSetBudget) {
      // Use parent callback to open edit mode
      onSetBudget(category, amount)
      toast.success(`Budget recommendation applied for ${category}`)
    } else {
      // Fallback: create/update budget directly
      // This would require checking if budget exists first
      toast.info('Applying budget recommendation...')
    }
  }

  const handleGenerate = async () => {
    toast.info('Generating AI budget recommendations...')
    setIsEnabled(true)
    setIsExpanded(true)
  }

  const handleRefresh = async () => {
    toast.info('Generating fresh recommendations...')

    // Force refresh by changing the query key temporarily
    const refreshData = await fetchAIBudgetRecommendations({
      months: monthsOfHistory,
      includeBasic: true,
      refresh: true
    })

    // Invalidate and refetch
    await refetch()

    toast.success('Recommendations updated!')
  }

  // Separate function to fetch with refresh flag
  async function fetchAIBudgetRecommendations(options: {
    months: number
    includeBasic: boolean
    refresh: boolean
  }) {
    const params = new URLSearchParams()
    params.append('months', options.months.toString())
    params.append('includeBasic', options.includeBasic.toString())
    if (options.refresh) params.append('refresh', 'true')

    const response = await fetch(`/api/budgets/ai-recommendations?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch')
    return response.json()
  }

  const handleDismiss = (category: string) => {
    // Could store dismissed recommendations in localStorage
    console.log('Dismissed recommendation for', category)
  }

  if (isLoading) {
    return (
      <div className="ios-card p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Analyzing spending patterns...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ios-card p-4 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Budget Suggestions</p>
              <p className="text-xs text-destructive">Failed to generate</p>
            </div>
          </div>
          <Button onClick={handleRefresh} size="sm" variant="ghost" className="text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Show generate button if not enabled yet or no data
  if (!isEnabled || !data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className="ios-card p-4 border border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {!isEnabled
                  ? 'AI Budget Suggestions'
                  : data?.summary?.dataPoints
                    ? 'Not enough data for AI recommendations'
                    : 'Add more expenses for AI suggestions'}
              </p>
            </div>
          </div>
          {!isEnabled && (
            <Button onClick={handleGenerate} size="sm" variant="ghost" className="gap-1.5 flex-shrink-0 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          )}
        </div>
      </div>
    )
  }

  const { recommendations, summary } = data
  const aiRecommendations = recommendations.filter((r) => r.isAI)
  const hasAIRecommendations = aiRecommendations.length > 0

  return (
    <div className="space-y-3">
      {/* Header Card */}
      <motion.div
        className="ios-card p-4 cursor-pointer select-none border border-border/50"
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">AI Budget Suggestions</h3>
                {hasAIRecommendations && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {aiRecommendations.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.monthsAnalyzed} months • {summary.dataPoints} expenses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleRefresh()
              }}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {!isExpanded && summary.totalSavingsOpportunity > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Potential savings</span>
              <span className="font-medium text-muted-foreground">
                ₫{(summary.totalSavingsOpportunity / 1000).toFixed(0)}k/mo
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BudgetRecommendations
              recommendations={recommendations}
              onAcceptRecommendation={handleAcceptRecommendation}
              onDismiss={handleDismiss}
              showAIBadge={true}
            />

            {/* Data Source Info */}
            <div className="ios-card p-4 mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    {summary.aiPowered} AI-powered • {summary.algorithmic} algorithmic
                  </span>
                  {data.generatedAt && (
                    <span>Updated {new Date(data.generatedAt).toLocaleDateString()}</span>
                  )}
                  {data.cached && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      Cached
                    </span>
                  )}
                  {data.expiresAt && (
                    <span>
                      Expires {new Date(data.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMonthsOfHistory(6)}
                    className={`px-2 py-1 rounded ${
                      monthsOfHistory === 6
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    6m
                  </button>
                  <button
                    onClick={() => setMonthsOfHistory(12)}
                    className={`px-2 py-1 rounded ${
                      monthsOfHistory === 12
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    12m
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
