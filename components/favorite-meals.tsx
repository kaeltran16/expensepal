'use client'

import { motion } from 'framer-motion'
import { Heart, Plus, Utensils, X } from 'lucide-react'
import { useFavoriteMeals, useQuickAddMeal, useToggleFavorite, type SavedFood } from '@/lib/hooks'
import { hapticFeedback } from '@/lib/utils'

export function FavoriteMeals() {
  const { data: favorites, isLoading } = useFavoriteMeals()
  const quickAddMeal = useQuickAddMeal()
  const toggleFavorite = useToggleFavorite()

  const handleQuickAdd = (food: SavedFood) => {
    hapticFeedback('medium')
    quickAddMeal.mutate(food)
  }

  const handleUnfavorite = (food: SavedFood, e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('light')
    toggleFavorite.mutate({ id: food.id, is_favorite: false })
  }

  if (isLoading) {
    return (
      <div className="ios-card p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-muted" />
          <div className="h-5 w-32 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!favorites || favorites.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Favorite Meals</h3>
            <p className="text-xs text-muted-foreground">Quick add your go-to meals</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="text-center py-6 px-4 rounded-2xl bg-accent/5 dark:bg-accent/10 border border-accent/20">
          <Heart className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No favorites yet</p>
          <p className="text-xs text-muted-foreground">
            Swipe right on a meal to save it here
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Favorite Meals</h3>
          <p className="text-xs text-muted-foreground">{favorites.length} saved • Tap to add</p>
        </div>
      </div>

      {/* Favorites list */}
      <div className="space-y-2">
        {favorites.map((food, index) => (
          <motion.div
            key={food.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAdd(food)}
              disabled={quickAddMeal.isPending}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/5 dark:bg-accent/10 border border-accent/20 text-left transition-all hover:shadow-sm active:bg-accent/10 dark:active:bg-accent/20"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
                <Utensils className="h-5 w-5 text-white" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{food.name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-accent">{food.calories} cal</span>
                  {(food.protein > 0 || food.carbs > 0 || food.fat > 0) && (
                    <>
                      <span>•</span>
                      <span>P:{food.protein}g C:{food.carbs}g F:{food.fat}g</span>
                    </>
                  )}
                </div>
              </div>

              {/* Add button */}
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-md shadow-accent/30">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </motion.button>

            {/* Remove button */}
            <button
              onClick={(e) => handleUnfavorite(food, e)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
