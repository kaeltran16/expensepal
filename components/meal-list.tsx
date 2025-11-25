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
    <div className="space-y-6">
      {(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const).map((time) => {
        const timeMeals = displayedMeals.filter((m) => m.meal_time === time)
        if (timeMeals.length === 0) return null

        const Icon = MEAL_TIME_ICONS[time]
        const colorClass = MEAL_TIME_COLORS[time]

        return (
          <div key={time} className="space-y-3">
            {/* Group Header */}
            <div className={`flex items-center gap-2 px-1 ${colorClass.split(' ')[2]}`}>
              <Icon className="w-4 h-4" />
              <h3 className="text-sm font-semibold capitalize">{time}</h3>
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {timeMeals.reduce((sum, m) => sum + m.calories, 0)} cal
              </span>
            </div>

            {/* Meals in this group */}
            <div className="space-y-3">
              {timeMeals.map((meal) => (
                <SwipeableCard
                  key={meal.id}
                  onDelete={() => handleDelete(meal.id)}
                  confirmTitle="Delete Meal?"
                  confirmMessage={`Are you sure you want to delete "${meal.name}"? This will remove ${meal.calories} calories from your daily log. This action cannot be undone.`}
                >
                  <Card
                    className={`frosted-card border-l-4 ${
                      meal.source === 'email' ? 'border-l-purple-500' : 'border-l-blue-500'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        {/* Left: Meal name and type */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base leading-tight mb-0.5">
                            {meal.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{formatTimeGMT7(meal.meal_date)}</span>
                            {meal.confidence && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  Number(meal.confidence) > 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  Number(meal.confidence) > 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {meal.confidence}%
                                </span>
                              </>
                            )}
                          </div>
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
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">P: {Math.round(meal.protein || 0)}g</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">C: {Math.round(meal.carbs || 0)}g</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">F: {Math.round(meal.fat || 0)}g</span>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
