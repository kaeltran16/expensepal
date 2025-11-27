'use client'

import { CalorieTracker } from '@/components/calorie-tracker';
import { MealList } from '@/components/meal-list';
import { MealPlanner } from '@/components/meal-planner';
import { NutritionCharts } from '@/components/nutrition-charts';
import { QuickMealForm } from '@/components/quick-meal-form';
import { MealFilterSheet } from '@/components/meal-filter-sheet';
import { InsightCardSkeleton } from '@/components/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/utils';
import { useMealFilters } from '@/lib/hooks';
import { Filter } from 'lucide-react';
import { useState } from 'react';

interface CaloriesViewProps {
  meals: any[];
  calorieStats: any;
  loading: boolean;
  showAllMeals?: boolean;
  onToggleShowAll?: () => void;
}

export function CaloriesView({ meals, calorieStats, loading, showAllMeals = false, onToggleShowAll }: CaloriesViewProps) {
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Use meal filters hook
  const {
    filteredMeals,
    quickFilter,
    mealTimeFilter,
    setQuickFilter,
    setMealTimeFilter,
    clearFilters,
    hasActiveFilters,
  } = useMealFilters(meals);

  if (loading) {
    return (
      <div className="space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
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

      {/* Meal list with filter button */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Meals</h2>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant={hasActiveFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowFilterSheet(true);
                  hapticFeedback('light');
                }}
                className="gap-2 ios-touch min-h-touch rounded-full px-4"
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-primary-foreground"
                  />
                )}
              </Button>
            </motion.div>

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
        </div>
        <MealList meals={filteredMeals} showAll={showAllMeals} />
      </div>

      {/* Nutrition charts */}
      {calorieStats && calorieStats.mealCount > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Nutrition Analytics</h2>
          <NutritionCharts stats={calorieStats} />
        </div>
      )}

      {/* Meal Filter Sheet */}
      <MealFilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        quickFilter={quickFilter}
        mealTimeFilter={mealTimeFilter}
        onQuickFilterChange={setQuickFilter}
        onMealTimeFilterChange={setMealTimeFilter}
        onReset={() => {
          clearFilters();
          setShowFilterSheet(false);
        }}
      />
    </div>
  );
}
