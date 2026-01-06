'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Lightbulb, Check, X, Sparkles, Calendar, User, PiggyBank } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import type { AIBudgetRecommendation } from '@/lib/analytics/budget-recommendations'
import { useState } from 'react'

interface BudgetRecommendationsProps {
  recommendations: AIBudgetRecommendation[]
  onAcceptRecommendation?: (category: string, amount: number) => void
  onDismiss?: (category: string) => void
  showAIBadge?: boolean
}

export function BudgetRecommendations({
  recommendations,
  onAcceptRecommendation,
  onDismiss,
  showAIBadge = true,
}: BudgetRecommendationsProps) {
  const [dismissedCategories, setDismissedCategories] = useState<Set<string>>(
    new Set()
  )

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedCategories.has(rec.category)
  )

  if (visibleRecommendations.length === 0) {
    return null
  }

  const handleDismiss = (category: string) => {
    setDismissedCategories((prev) => new Set(prev).add(category))
    onDismiss?.(category)
  }

  const getTrendIcon = (trend: AIBudgetRecommendation['trend']) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getConfidenceBadge = (confidence: AIBudgetRecommendation['confidence']) => {
    const colors = {
      high: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      medium:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    }

    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${colors[confidence]}`}
      >
        {confidence} confidence
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="ios-headline">Budget Recommendations</h3>
      </div>

      <div className="space-y-3">
        {visibleRecommendations.map((rec, index) => (
          <motion.div
            key={rec.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base">{rec.category}</h4>
                    {getTrendIcon(rec.trend)}
                    {showAIBadge && rec.isAI && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </span>
                    )}
                  </div>
                  {rec.percentChange !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {rec.trend === 'increasing' ? '+' : ''}
                      {rec.percentChange.toFixed(0)}% vs. previous average
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(rec.category)}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                  aria-label="Dismiss recommendation"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {rec.suggestedAmount.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-sm text-muted-foreground">VND/month</span>
                </div>
                {rec.currentAmount && (
                  <p className="text-sm text-muted-foreground">
                    Current: {rec.currentAmount.toLocaleString('vi-VN')} VND
                  </p>
                )}
              </div>

              {/* Reasoning */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rec.reasoning}
              </p>

              {/* AI-Enhanced Insights */}
              {rec.isAI && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {rec.seasonalFactors && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Seasonal Factors</p>
                        <p className="text-xs text-muted-foreground">{rec.seasonalFactors}</p>
                      </div>
                    </div>
                  )}
                  {rec.lifestyleInsights && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Lifestyle Insights</p>
                        <p className="text-xs text-muted-foreground">{rec.lifestyleInsights}</p>
                      </div>
                    </div>
                  )}
                  {rec.savingsOpportunity && rec.savingsOpportunity > 0 && (
                    <div className="flex items-start gap-2">
                      <PiggyBank className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Savings Opportunity</p>
                        <p className="text-xs text-muted-foreground">
                          Potential to save {rec.savingsOpportunity.toLocaleString('vi-VN')} VND/month
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                {getConfidenceBadge(rec.confidence)}

                {onAcceptRecommendation && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onAcceptRecommendation(rec.category, rec.suggestedAmount)
                    }
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Apply Budget
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
