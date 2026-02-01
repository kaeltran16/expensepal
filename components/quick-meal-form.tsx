'use client'

import { motion } from 'framer-motion'
import { Loader2, Sparkles, Utensils, Sun, Moon, Coffee, Cookie, Zap } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateMealOptimistic } from '@/lib/hooks'
import { getCurrentISOInGMT7 } from '@/lib/timezone'
import { hapticFeedback } from '@/lib/utils'

const MEAL_TIMES = [
  { value: 'breakfast', label: 'Breakfast', icon: Coffee, emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: Sun, emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: Moon, emoji: '🌙' },
  { value: 'snack', label: 'Snack', icon: Cookie, emoji: '🍿' },
]

export function QuickMealForm() {
  const [name, setName] = useState('')
  const [mealTime, setMealTime] = useState<string>('snack')
  const [isManual, setIsManual] = useState(false)
  const [manualCalories, setManualCalories] = useState('')

  const createMealMutation = useCreateMealOptimistic()

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Please enter a meal name')
      return
    }

    hapticFeedback('medium')
    const localISOString = getCurrentISOInGMT7()

    try {
      await createMealMutation.mutateAsync({
        name: name.trim(),
        meal_time: mealTime,
        meal_date: localISOString,
        source: isManual ? 'manual' : 'llm',
        estimate: !isManual,
        calories: isManual && manualCalories ? parseInt(manualCalories) : undefined,
      })

      setName('')
      setManualCalories('')
      hapticFeedback('light')
    } catch (error) {
      console.error('Error logging meal:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-5"
    >
      {/* Header with gradient icon */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Utensils className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Quick Meal Log</h3>
          <p className="text-xs text-muted-foreground">
            {isManual ? 'Enter calories manually' : 'AI-powered estimation'}
          </p>
        </div>
      </div>

      <form onSubmit={handleQuickLog} className="space-y-4">
        {/* Meal name input */}
        <div className="relative">
          <input
            type="text"
            placeholder="What did you eat? (e.g., Phở bò)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMealMutation.isPending}
            className="w-full h-12 px-4 rounded-xl bg-muted/50 border-2 border-transparent focus:border-orange-500/50 focus:bg-background transition-all duration-200 outline-none text-base placeholder:text-muted-foreground/60"
          />
          {!isManual && name && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Sparkles className="h-4 w-4 text-orange-500" />
            </motion.div>
          )}
        </div>

        {/* Meal time selector - pill style */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-full">
          {MEAL_TIMES.map((time) => (
            <motion.button
              key={time.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMealTime(time.value)
                hapticFeedback('light')
              }}
              disabled={createMealMutation.isPending}
              className={`
                flex-1 py-2.5 px-2 rounded-full text-xs font-medium transition-all duration-200
                ${mealTime === time.value
                  ? 'bg-white dark:bg-card text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <span className="hidden sm:inline">{time.emoji} </span>
              {time.label}
            </motion.button>
          ))}
        </div>

        {/* Manual calories input */}
        {isManual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="number"
              inputMode="numeric"
              placeholder="Calories"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
              disabled={createMealMutation.isPending}
              className="w-full h-12 px-4 rounded-xl bg-muted/50 border-2 border-transparent focus:border-orange-500/50 focus:bg-background transition-all duration-200 outline-none text-base placeholder:text-muted-foreground/60"
            />
          </motion.div>
        )}

        {/* Mode toggle and submit */}
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setIsManual(!isManual)
              hapticFeedback('light')
            }}
            disabled={createMealMutation.isPending}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
              ${isManual
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            {isManual ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </motion.button>

          {/* Submit button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={createMealMutation.isPending || !name.trim()}
            className={`
              flex-1 flex items-center justify-center gap-2 h-12 rounded-full
              font-semibold text-base transition-all duration-200
              ${createMealMutation.isPending || !name.trim()
                ? 'bg-orange-400/50 text-white/70 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98] shadow-lg shadow-orange-500/25'
              }
            `}
          >
            {createMealMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Estimating...</span>
              </>
            ) : (
              <>
                {isManual ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                <span>Log Meal</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Helper text */}
        {!isManual && (
          <p className="text-xs text-center text-muted-foreground">
            <Sparkles className="w-3 h-3 inline mr-1" />
            AI will estimate calories based on typical portions
          </p>
        )}
      </form>
    </motion.div>
  )
}
