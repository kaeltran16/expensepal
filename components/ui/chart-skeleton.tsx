'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton loader for chart components
 * Used while lazy-loading Recharts bundle
 */
export function ChartSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Chart title */}
        <Skeleton className="h-6 w-32" />

        {/* Chart area */}
        <div className="space-y-2">
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for nutrition/calorie charts
 * Slightly different layout for calorie tracking
 */
export function NutritionChartSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          {/* Chart title */}
          <Skeleton className="h-6 w-40" />

          {/* Pie chart circle */}
          <div className="flex justify-center py-4">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>

          {/* Stats below chart */}
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
      </Card>
    </div>
  )
}
