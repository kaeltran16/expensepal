'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Plus, Check, GlassWater, Undo2 } from 'lucide-react'
import { useWaterLog, useAddWater, useSetWater } from '@/lib/hooks'
import { hapticFeedback } from '@/lib/utils'

const GLASS_SIZE = 250 // ml per glass

const QUICK_ADD_OPTIONS = [250, 500, 750] // ml options (1, 2, or 3 glasses)

export function WaterIntake() {
  const [selectedAmount, setSelectedAmount] = useState(250)
  const { data, isLoading } = useWaterLog()
  const addWater = useAddWater()
  const setWater = useSetWater()

  const currentAmount = data?.waterLog.amount_ml || 0
  const dailyGoal = data?.daily_goal_ml || 2000
  const glasses = Math.floor(currentAmount / GLASS_SIZE)
  const totalGlasses = Math.ceil(dailyGoal / GLASS_SIZE)
  const progress = Math.min(100, (currentAmount / dailyGoal) * 100)
  const remaining = Math.max(0, dailyGoal - currentAmount)

  const handleAddWater = (amount: number) => {
    hapticFeedback('light')
    addWater.mutate({ amount_ml: amount })
  }

  const handleRemoveWater = () => {
    if (currentAmount <= 0) return
    hapticFeedback('light')
    const newAmount = Math.max(0, currentAmount - selectedAmount)
    setWater.mutate({ amount_ml: newAmount })
  }

  const handleGlassClick = (index: number) => {
    hapticFeedback('light')
    // Clicking a glass selects that many glasses worth of water to add
    const amount = (index + 1) * GLASS_SIZE
    setSelectedAmount(amount)
  }

  if (isLoading) {
    return (
      <div className="ios-card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
        </div>
        <div className="h-3 rounded-full bg-muted mb-5" />
        <div className="flex justify-center gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-8 h-10 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-5"
    >
      {/* Header with icon and stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Water Intake</h3>
            <p className="text-xs text-muted-foreground">
              {remaining > 0 ? `${remaining}ml to go` : 'Goal reached!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(currentAmount / 1000).toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">L</span>
          </div>
          <p className="text-xs text-muted-foreground">
            of {(dailyGoal / 1000).toFixed(1)}L
          </p>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="relative h-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            progress >= 100
              ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-500'
          }`}
        />
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

      {/* Glass indicators - tap to select amount */}
      <div className="flex justify-center gap-2 mb-5">
        {[...Array(Math.min(totalGlasses, 8))].map((_, index) => {
          const isFilled = index < glasses
          const isPartial = index === glasses && currentAmount % GLASS_SIZE > 0
          const fillPercent = isPartial
            ? ((currentAmount % GLASS_SIZE) / GLASS_SIZE) * 100
            : 0
          // Highlight the glasses that will be filled when adding the selected amount
          // e.g., if 2 glasses filled and adding 500ml (2 glasses), highlight glasses 2 and 3
          const glassesToAdd = Math.ceil(selectedAmount / GLASS_SIZE)
          const isSelected = !isFilled && !isPartial && index < glasses + glassesToAdd

          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.08, y: -2 }}
              onClick={() => handleGlassClick(index)}
              className={`
                relative w-8 h-10 rounded-xl overflow-hidden transition-all duration-300
                ${isFilled
                  ? 'bg-gradient-to-b from-blue-400 to-blue-600 shadow-md shadow-blue-500/40'
                  : isSelected
                    ? 'bg-blue-200 dark:bg-blue-800 border-2 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/30'
                    : 'bg-muted/50 dark:bg-muted/30 border-2 border-muted-foreground/20'
                }
              `}
            >
              {/* Partial fill animation */}
              {isPartial && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${fillPercent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400"
                />
              )}

              {/* Water wave effect for filled glasses */}
              {isFilled && (
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/40 to-transparent" />
                </div>
              )}

              {/* Glass icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <GlassWater
                  className={`h-4 w-4 transition-colors duration-200 ${
                    isFilled
                      ? 'text-white'
                      : isSelected
                        ? 'text-blue-600 dark:text-blue-300'
                        : isPartial
                          ? 'text-blue-500'
                          : 'text-muted-foreground/50'
                  }`}
                />
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Amount selector - pill style */}
      <div className="flex items-center justify-center gap-1 p-1 bg-muted/50 rounded-full mb-4">
        {QUICK_ADD_OPTIONS.map((amount) => (
          <motion.button
            key={amount}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedAmount(amount)
              hapticFeedback('light')
            }}
            className={`
              flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all duration-200
              ${selectedAmount === amount
                ? 'bg-white dark:bg-card text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {amount}ml
          </motion.button>
        ))}
        {/* Show custom amount when not in presets */}
        {!QUICK_ADD_OPTIONS.includes(selectedAmount) && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex-1 py-2 px-3 rounded-full text-sm font-medium bg-white dark:bg-card text-blue-600 dark:text-blue-400 shadow-sm text-center"
          >
            {selectedAmount}ml
          </motion.div>
        )}
      </div>

      {/* Action buttons - add and undo */}
      <div className="flex items-center gap-3">
        {/* Undo/remove button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRemoveWater}
          disabled={currentAmount <= 0 || setWater.isPending}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full
            transition-all duration-200
            ${currentAmount <= 0 || setWater.isPending
              ? 'bg-muted text-muted-foreground/30 cursor-not-allowed'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground active:scale-90'
            }
          `}
        >
          <Undo2 className="h-5 w-5" />
        </motion.button>

        {/* Main add button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAddWater(selectedAmount)}
          disabled={addWater.isPending}
          className={`
            flex-1 flex items-center justify-center gap-2 h-12 rounded-full
            font-semibold text-base transition-all duration-200
            ${addWater.isPending
              ? 'bg-blue-400 text-white/70 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-[0.98] shadow-lg shadow-blue-500/25'
            }
          `}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          <span>Add {selectedAmount}ml</span>
        </motion.button>
      </div>

      {/* Completion celebration */}
      {progress >= 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800/50"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/30"
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.div>
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            Daily hydration goal complete!
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
