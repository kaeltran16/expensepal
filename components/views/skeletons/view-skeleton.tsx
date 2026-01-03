'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Generic view skeleton loader
 * Used while lazy-loading view components
 */
export function ViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-8 w-48" />

      {/* Cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Budget view skeleton
 */
export function BudgetViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />

      {/* Budget cards */}
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Goals view skeleton
 */
export function GoalsViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-36" />

      {[1, 2].map((i) => (
        <Card key={i} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex justify-between text-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Analytics/Insights view skeleton
 */
export function AnalyticsViewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />

      {/* Chart skeleton */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </Card>

      {/* Insights */}
      <div className="space-y-3">
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
    </div>
  )
}

/**
 * Workouts view skeleton
 */
export function WorkoutsViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-10 w-32" />
      </div>

      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Calories view skeleton
 */
export function CaloriesViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-36" />

      {/* Calorie goal card */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex justify-center">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
      </Card>

      {/* Meal list */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </Card>
      ))}
    </div>
  )
}
