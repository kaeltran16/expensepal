import type { Expense } from '@/lib/supabase';
import type { QuickFilterType } from '@/lib/constants/filters';
import { useState, useEffect, useMemo } from 'react';
import { getNowInGMT7, getTodayInGMT7 } from '@/lib/timezone';

export function useExpenseFilters(expenses: Expense[]) {
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Use useMemo to compute filtered expenses instead of useEffect
  const computed = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery.trim()) {
      const lowerSearch = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.merchant.toLowerCase().includes(lowerSearch) ||
          e.category?.toLowerCase().includes(lowerSearch) ||
          e.notes?.toLowerCase().includes(lowerSearch)
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }

    // Date range filter (using GMT+7)
    const now = getNowInGMT7();
    const today = getTodayInGMT7();

    if (quickFilter === 'today') {
      filtered = filtered.filter((e) => {
        const expenseDate = e.transaction_date.split('T')[0];
        return expenseDate === today;
      });
    } else if (quickFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (e) => new Date(e.transaction_date) >= weekAgo
      );
    } else if (quickFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(
        (e) => new Date(e.transaction_date) >= monthAgo
      );
    }

    return filtered;
  }, [expenses, quickFilter, categoryFilter, searchQuery]);

  const clearFilters = () => {
    setQuickFilter('all');
    setCategoryFilter('All');
    setSearchQuery('');
  };

  const hasActiveFilters = quickFilter !== 'all' || categoryFilter !== 'All' || searchQuery !== '';

  return {
    filteredExpenses: computed,
    quickFilter,
    categoryFilter,
    searchQuery,
    setQuickFilter,
    setCategoryFilter,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  };
}
