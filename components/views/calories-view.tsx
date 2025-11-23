'use client'

import { CalorieTracker } from '@/components/calorie-tracker';
import { MealList } from '@/components/meal-list';
import { MealPlanner } from '@/components/meal-planner';
import { NutritionCharts } from '@/components/nutrition-charts';
import { QuickMealForm } from '@/components/quick-meal-form';
import { InsightCardSkeleton } from '@/components/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/utils';

interface CaloriesViewProps {
  meals: any[];
  calorieStats: any;
  loading: boolean;
  showAllMeals?: boolean;
  onToggleShowAll?: () => void;
}

export function CaloriesView({ meals, calorieStats, loading, showAllMeals = false, onToggleShowAll }: CaloriesViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    );
  }

  // Empty state
  if (meals.length === 0 && !calorieStats) {
    return (
      <EmptyState
        icon="🍔"
        title="No meals tracked yet"
        description="Start logging your meals to track calories and nutrition"
        size="lg"
        animationVariant="bounce"
      />
    );
  }

  // Content view
  return (
    <div className="space-y-6">
      {/* Quick meal form */}
      <QuickMealForm />

      {/* Daily calorie tracker */}
      <CalorieTracker />

      {/* Meal planner */}
      <MealPlanner />

      {/* Meal list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Meals</h2>
          {meals.length > 10 && onToggleShowAll && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onToggleShowAll();
                  hapticFeedback('light');
                }}
                className="gap-2 ios-touch min-h-touch text-primary rounded-full px-4"
              >
                {showAllMeals ? 'Less' : 'All'}
              </Button>
            </motion.div>
          )}
        </div>
        <MealList meals={meals} showAll={showAllMeals} />
      </div>

      {/* Nutrition charts */}
      {calorieStats && calorieStats.mealCount > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Nutrition Analytics</h2>
          <NutritionCharts stats={calorieStats} />
        </div>
      )}
    </div>
  );
}
