'use client'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SwipeableCard } from '@/components/ui/swipeable-card'
import { useDeleteMealOptimistic } from '@/lib/hooks'
import type { Meal } from '@/lib/supabase'
import { formatTimeGMT7 } from '@/lib/timezone'
import { hapticFeedback } from '@/lib/utils'
import {
  Apple,
  Coffee,
  Moon,
  Sun
} from 'lucide-react'

interface MealListProps {
  meals: (Meal & { expenses?: any })[]
  onMealDeleted?: () => void
  showAll?: boolean
}

const MEAL_TIME_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
  other: Apple,
}

const MEAL_TIME_COLORS = {
  breakfast: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  lunch: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  dinner: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
  snack: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  other: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
}

const CONFIDENCE_BADGES = {
  high: { color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300', label: 'High confidence' },
  medium: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300', label: 'Medium confidence' },
  low: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300', label: 'Low confidence' },
}

export function MealList({ meals, onMealDeleted, showAll = false }: MealListProps) {
  // Use optimistic delete mutation
  const deleteMealMutation = useDeleteMealOptimistic()

  const handleDelete = async (id: string) => {
    try {
      hapticFeedback('heavy')
      // Optimistic delete (meal disappears immediately)
      await deleteMealMutation.mutateAsync(id)

      // Optional callback for backwards compatibility
      onMealDeleted?.()
    } catch (error) {
      console.error('Error deleting meal:', error)
      // Error toast is handled by the mutation
    }
  }

  if (meals.length === 0) {
    return (
      <EmptyState
        icon={<Apple className="w-16 h-16 opacity-50" />}
        title="No meals logged yet"
        description="Start tracking your meals above"
        size="sm"
        animationVariant="pulse"
      />
    )
  }

  // Display first 10 meals or all based on showAll prop
  const displayedMeals = showAll ? meals : meals.slice(0, 5)

  return (
    <div className="space-y-3">
      {displayedMeals.map((meal) => {
        const mealTime = (meal.meal_time || 'other') as keyof typeof MEAL_TIME_ICONS
        const Icon = MEAL_TIME_ICONS[mealTime]
        const colorClass = MEAL_TIME_COLORS[mealTime]

        return (
          <SwipeableCard
            key={meal.id}
            onDelete={() => handleDelete(meal.id)}
            confirmTitle="Delete Meal?"
            confirmMessage={`Are you sure you want to delete "${meal.name}"? This will remove ${meal.calories} calories from your daily log. This action cannot be undone.`}
          >
            <Card className="frosted-card border-l-4 border-l-primary/50">
              <CardContent className="p-3">
                {/* Meal time badge at the top */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold capitalize">{meal.meal_time || 'other'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeGMT7(meal.meal_date)}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 mb-2">
                  {/* Left: Meal name */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base leading-tight mb-0.5">
                      {meal.name}
                    </h4>
                    {meal.confidence && (
                      (() => {
                        const score = parseFloat(meal.confidence)
                        const level = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
                        const badge = CONFIDENCE_BADGES[level]
                        return (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block ${badge.color}`}>
                            {meal.confidence} confidence
                          </span>
                        )
                      })()
                    )}
                  </div>

                  {/* Right: Calories */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-xl text-primary leading-tight">
                      {meal.calories.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">cal</div>
                  </div>
                </div>

                {/* Macros */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium">P: {Math.round(meal.protein || 0)}g</span>
                  <span className="font-medium">C: {Math.round(meal.carbs || 0)}g</span>
                  <span className="font-medium">F: {Math.round(meal.fat || 0)}g</span>
                </div>
              </CardContent>
            </Card>
          </SwipeableCard>
        )
      })}
    </div>
  )
}
