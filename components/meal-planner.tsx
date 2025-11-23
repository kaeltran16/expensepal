'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, Calendar, Check, Coffee, Moon, Plus, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface PlannedMeal {
  id: string
  name: string
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: string
  estimatedCalories?: number
}

const MEAL_TIME_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
}

const MEAL_TIME_COLORS = {
  breakfast: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  lunch: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  dinner: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
  snack: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
}

export function MealPlanner() {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [mealName, setMealName] = useState('')
  const [mealTime, setMealTime] = useState<PlannedMeal['mealTime']>('lunch')
  const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0])
  const [estimatedCalories, setEstimatedCalories] = useState('')

  const handleAddMeal = () => {
    if (!mealName.trim()) {
      toast.error('Please enter a meal name')
      return
    }

    const newMeal: PlannedMeal = {
      id: Date.now().toString(),
      name: mealName.trim(),
      mealTime,
      date: mealDate,
      estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : undefined,
    }

    setPlannedMeals([...plannedMeals, newMeal])
    setMealName('')
    setEstimatedCalories('')
    setMealDate(new Date().toISOString().split('T')[0])
    setIsDialogOpen(false)
    hapticFeedback('light')
    toast.success('Meal added to plan')
  }

  const handleDeleteMeal = (id: string) => {
    setPlannedMeals(plannedMeals.filter((m) => m.id !== id))
    hapticFeedback('medium')
    toast.success('Meal removed from plan')
  }

  const handleMarkAsEaten = (meal: PlannedMeal) => {
    // This would integrate with the existing meal tracking system
    handleDeleteMeal(meal.id)
    hapticFeedback('light')
    toast.success('Meal logged! Add details if needed.')
  }

  // Group meals by date
  const groupedMeals = plannedMeals.reduce((acc, meal) => {
    if (!acc[meal.date]) {
      acc[meal.date] = []
    }
    acc[meal.date].push(meal)
    return acc
  }, {} as Record<string, PlannedMeal[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedMeals).sort()

  const getTodayDateString = () => new Date().toISOString().split('T')[0]
  const getTomorrowDateString = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const formatDateLabel = (dateString: string) => {
    const today = getTodayDateString()
    const tomorrow = getTomorrowDateString()

    if (dateString === today) return 'Today'
    if (dateString === tomorrow) return 'Tomorrow'

    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base">Meal Plan</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Plan Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Plan a Meal</DialogTitle>
              <DialogDescription>
                Add a meal to your plan for tracking later
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="meal-name">Meal Name</Label>
                <Input
                  id="meal-name"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="e.g., Grilled Chicken Salad"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meal-time">Meal Time</Label>
                <Select value={mealTime} onValueChange={(value) => setMealTime(value as PlannedMeal['mealTime'])}>
                  <SelectTrigger id="meal-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meal-date">Date</Label>
                <Input
                  id="meal-date"
                  type="date"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calories">Estimated Calories (optional)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={estimatedCalories}
                  onChange={(e) => setEstimatedCalories(e.target.value)}
                  placeholder="500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMeal}>Add to Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Planned Meals */}
      {sortedDates.length === 0 ? (
        <Card className="frosted-card">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">No meals planned yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start planning your meals to stay on track with your nutrition goals
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Plan Your First Meal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  {formatDateLabel(date)}
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {groupedMeals[date].map((meal) => {
                    const Icon = MEAL_TIME_ICONS[meal.mealTime]
                    const colorClass = MEAL_TIME_COLORS[meal.mealTime]

                    return (
                      <motion.div
                        key={meal.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className={`frosted-card border-l-4 ${colorClass.replace('bg-', 'border-l-').split(' ')[0]}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm leading-tight mb-0.5">
                                  {meal.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="capitalize">{meal.mealTime}</span>
                                  {meal.estimatedCalories && (
                                    <>
                                      <span>•</span>
                                      <span>~{meal.estimatedCalories} cal</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsEaten(meal)}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  title="Mark as eaten"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMeal(meal.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Remove from plan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
