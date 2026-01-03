'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  Calendar,
} from 'lucide-react'
import type { Expense } from '@/lib/supabase'
import { InsightCard } from '@/components/insights'
import { useInsights } from '@/lib/hooks'

interface CategoryInsightsProps {
  expenses: Expense[]
}

export function CategoryInsights({ expenses }: CategoryInsightsProps) {
  // Use cached insights hook instead of useMemo for better performance
  const { data: insights = [], isLoading } = useInsights(expenses, {
    formatCurrency,
    icons: {
      TrendingUp,
      TrendingDown,
      AlertCircle,
      Lightbulb,
      Calendar,
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Not enough data yet</h3>
        <p className="text-muted-foreground text-sm">
          Keep tracking expenses for a few weeks to see personalized insights
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Insights</h2>
          <p className="text-sm text-muted-foreground">Personalized spending patterns</p>
        </div>
      </div>

      {insights.map((insight, index) => (
        <InsightCard
          key={index}
          type={insight.type}
          category={insight.category}
          title={insight.title}
          description={insight.description}
          value={insight.value}
          change={insight.change}
          icon={insight.icon}
          index={index}
        />
      ))}
    </div>
  )
}
