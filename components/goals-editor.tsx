'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, X, Flame, Dumbbell, Cookie, Droplet, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCalorieGoal, useUpdateCalorieGoal } from '@/lib/hooks/use-meals'
import { hapticFeedback } from '@/lib/utils'

interface GoalsEditorProps {
  isOpen: boolean
  onClose: () => void
}

export function GoalsEditor({ isOpen, onClose }: GoalsEditorProps) {
  const { data: currentGoal } = useCalorieGoal()
  const updateGoal = useUpdateCalorieGoal()

  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  // Initialize form with current values
  useEffect(() => {
    if (currentGoal) {
      setCalories(currentGoal.daily_calories?.toString() || '2000')
      setProtein(currentGoal.protein_target?.toString() || '100')
      setCarbs(currentGoal.carbs_target?.toString() || '250')
      setFat(currentGoal.fat_target?.toString() || '65')
    }
  }, [currentGoal])

  const handleSave = () => {
    hapticFeedback('medium')
    updateGoal.mutate(
      {
        daily_calories: parseInt(calories) || 2000,
        protein_target: parseInt(protein) || 100,
        carbs_target: parseInt(carbs) || 250,
        fat_target: parseInt(fat) || 65,
      },
      {
        onSuccess: onClose,
      }
    )
  }

  // Calculate calories from macros
  const calculatedCalories = () => {
    const p = parseInt(protein) || 0
    const c = parseInt(carbs) || 0
    const f = parseInt(fat) || 0
    return p * 4 + c * 4 + f * 9
  }

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl p-6 pb-safe max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Daily Goals</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Calories */}
              <div className="space-y-2">
                <Label htmlFor="calories" className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Daily Calories
                </Label>
                <Input
                  id="calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="2000"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 1500-2500 for most adults
                </p>
              </div>

              {/* Macros Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Macro Targets (grams)
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  {/* Protein */}
                  <div className="space-y-2">
                    <Label htmlFor="protein" className="flex items-center gap-1 text-xs">
                      <Dumbbell className="h-3 w-3 text-red-500" />
                      Protein
                    </Label>
                    <Input
                      id="protein"
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      placeholder="100"
                      className="text-center"
                    />
                  </div>

                  {/* Carbs */}
                  <div className="space-y-2">
                    <Label htmlFor="carbs" className="flex items-center gap-1 text-xs">
                      <Cookie className="h-3 w-3 text-yellow-500" />
                      Carbs
                    </Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      placeholder="250"
                      className="text-center"
                    />
                  </div>

                  {/* Fat */}
                  <div className="space-y-2">
                    <Label htmlFor="fat" className="flex items-center gap-1 text-xs">
                      <Droplet className="h-3 w-3 text-blue-500" />
                      Fat
                    </Label>
                    <Input
                      id="fat"
                      type="number"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      placeholder="65"
                      className="text-center"
                    />
                  </div>
                </div>

                {/* Calculated calories from macros */}
                <p className="text-xs text-muted-foreground text-center">
                  Macros total: ~{calculatedCalories()} cal
                  {Math.abs(calculatedCalories() - parseInt(calories || '0')) > 100 && (
                    <span className="text-yellow-500 ml-1">
                      (differs from calorie goal)
                    </span>
                  )}
                </p>
              </div>

              {/* Preset buttons */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Quick Presets
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCalories('1500')
                      setProtein('120')
                      setCarbs('150')
                      setFat('50')
                      hapticFeedback('light')
                    }}
                    className="rounded-full text-xs"
                  >
                    Weight Loss
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCalories('2000')
                      setProtein('100')
                      setCarbs('250')
                      setFat('65')
                      hapticFeedback('light')
                    }}
                    className="rounded-full text-xs"
                  >
                    Maintenance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCalories('2500')
                      setProtein('150')
                      setCarbs('300')
                      setFat('80')
                      hapticFeedback('light')
                    }}
                    className="rounded-full text-xs"
                  >
                    Muscle Gain
                  </Button>
                </div>
              </div>

              {/* Save button */}
              <Button
                onClick={handleSave}
                disabled={updateGoal.isPending}
                className="w-full rounded-full"
              >
                {updateGoal.isPending ? 'Saving...' : 'Save Goals'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Standalone trigger button component for use in CalorieTracker
export function EditGoalsButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        onClick()
        hapticFeedback('light')
      }}
      className="text-xs text-primary font-medium"
    >
      Edit Goals
    </motion.button>
  )
}
