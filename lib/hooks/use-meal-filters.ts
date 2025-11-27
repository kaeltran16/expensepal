import type { Meal } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import { getNowInGMT7, getTodayInGMT7 } from '@/lib/timezone';

type QuickFilterType = 'all' | 'today' | 'week' | 'month';
type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export function useMealFilters(meals: Meal[]) {
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [mealTimeFilter, setMealTimeFilter] = useState<MealTimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Use useMemo to compute filtered meals
  const filteredMeals = useMemo(() => {
    let filtered = [...meals];

    // Search filter
    if (searchQuery.trim()) {
      const lowerSearch = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(lowerSearch) ||
          m.meal_time?.toLowerCase().includes(lowerSearch)
      );
    }

    // Meal time filter
    if (mealTimeFilter !== 'all') {
      filtered = filtered.filter((m) => m.meal_time === mealTimeFilter);
    }

    // Date range filter (using GMT+7)
    const now = getNowInGMT7();
    const today = getTodayInGMT7();

    if (quickFilter === 'today') {
      filtered = filtered.filter((m) => {
        const mealDate = m.meal_date.split('T')[0];
        return mealDate === today;
      });
    } else if (quickFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (m) => new Date(m.meal_date) >= weekAgo
      );
    } else if (quickFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(
        (m) => new Date(m.meal_date) >= monthAgo
      );
    }

    return filtered;
  }, [meals, quickFilter, mealTimeFilter, searchQuery]);

  const clearFilters = () => {
    setQuickFilter('all');
    setMealTimeFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = quickFilter !== 'all' || mealTimeFilter !== 'all' || searchQuery !== '';

  return {
    filteredMeals,
    quickFilter,
    mealTimeFilter,
    searchQuery,
    setQuickFilter,
    setMealTimeFilter,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  };
}
