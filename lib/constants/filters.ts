export const QUICK_FILTERS = [
  { id: 'all', label: 'All', dateRange: 'all' as const },
  { id: 'today', label: 'Today', dateRange: 'today' as const },
  { id: 'week', label: 'Week', dateRange: 'week' as const },
  { id: 'month', label: 'Month', dateRange: 'month' as const },
];

export const CATEGORY_FILTERS = [
  'All',
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Health',
  'Other',
];

export const VIEW_ORDER: Array<'expenses' | 'analytics' | 'budget' | 'insights'> = [
  'expenses',
  'analytics',
  'budget',
  'insights',
];

export type QuickFilterType = 'all' | 'today' | 'week' | 'month';
export type ViewType = 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights' | 'calories';
