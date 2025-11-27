'use client'

import { Button } from '@/components/ui/button';
import { hapticFeedback } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Apple, Coffee, Moon, Sun } from 'lucide-react';

type QuickFilterType = 'all' | 'today' | 'week' | 'month';
type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

const QUICK_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

const MEAL_TIME_FILTERS: { id: MealTimeFilter; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Moon },
  { id: 'snack', label: 'Snack', icon: Apple },
  { id: 'other', label: 'Other', icon: Apple },
];

interface MealFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  quickFilter: QuickFilterType;
  mealTimeFilter: MealTimeFilter;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  onMealTimeFilterChange: (mealTime: MealTimeFilter) => void;
  onReset: () => void;
}

export function MealFilterSheet({
  isOpen,
  onClose,
  quickFilter,
  mealTimeFilter,
  onQuickFilterChange,
  onMealTimeFilterChange,
  onReset,
}: MealFilterSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              onClose();
              hapticFeedback('light');
            }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              duration: 0.35,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="fixed inset-x-0 bottom-0 z-[70] bg-card/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50"
            style={{ maxHeight: '75vh' }}
          >
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: '75vh' }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
              </div>

              <div className="px-6 pb-8">
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Meal Filters
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                    Refine your meal view
                  </p>
                </div>

                {/* Time Range - Segmented Control Style */}
                <div className="mb-10">
                  <h3 className="text-sm font-semibold mb-4 text-foreground/80">
                    TIME RANGE
                  </h3>
                  <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
                    {QUICK_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          onQuickFilterChange(
                            filter.id as QuickFilterType
                          );
                          hapticFeedback('light');
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                          quickFilter === filter.id
                            ? 'bg-card shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Time - Chip Selection */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 text-foreground/80">
                    MEAL TIME
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_TIME_FILTERS.map((mealTime) => {
                      const Icon = mealTime.icon;
                      return (
                        <button
                          key={mealTime.id}
                          onClick={() => {
                            onMealTimeFilterChange(mealTime.id);
                            hapticFeedback('medium');
                          }}
                          className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 overflow-hidden flex items-center gap-2 ${
                            mealTimeFilter === mealTime.id
                              ? 'bg-primary text-primary-foreground shadow-md scale-105'
                              : 'bg-muted/50 text-foreground/70 hover:bg-muted hover:text-foreground active:scale-95'
                          }`}
                        >
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{mealTime.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 min-h-touch-lg rounded-xl font-medium"
                    onClick={() => {
                      onReset();
                      hapticFeedback('light');
                    }}
                  >
                    Reset All
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 min-h-touch-lg rounded-xl font-medium shadow-lg"
                    onClick={() => {
                      onClose();
                      hapticFeedback('medium');
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
