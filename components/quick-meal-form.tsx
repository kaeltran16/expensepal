'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateMealOptimistic } from '@/lib/hooks'
import { getCurrentISOInGMT7 } from '@/lib/timezone'

export function QuickMealForm() {
  const [name, setName] = useState('')
  const [mealTime, setMealTime] = useState<string>('other')
  const [isManual, setIsManual] = useState(false)

  // Manual entry fields
  const [manualCalories, setManualCalories] = useState('')

  // Use optimistic mutation
  const createMealMutation = useCreateMealOptimistic()

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Please enter a meal name')
      return
    }

    // Create meal_date in GMT+7 timezone
    const localISOString = getCurrentISOInGMT7()

    try {
      // Use optimistic mutation (meal appears instantly)
      await createMealMutation.mutateAsync({
        name: name.trim(),
        meal_time: mealTime,
        meal_date: localISOString,
        source: isManual ? 'manual' : 'llm', // Use LLM estimation if not manual
        estimate: !isManual, // Trigger LLM estimation when not in manual mode
        calories: isManual ? parseInt(manualCalories) : undefined,
      })

      // Reset form on success
      setName('')
      setManualCalories('')
    } catch (error) {
      console.error('Error logging meal:', error)
      // Error toast is handled by the mutation
    }
  }

  return (
    <Card className="ios-card">
      <CardContent className="p-5">
        <form onSubmit={handleQuickLog} className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Utensils className="w-5 h-5 text-primary" />
            <h3 className="ios-headline">Quick Meal Log</h3>
          </div>

          {/* Meal name */}
          <div>
            <Input
              type="text"
              placeholder="What did you eat? (e.g., Phở bò)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ios-body min-h-touch"
              disabled={createMealMutation.isPending}
            />
            {!isManual && (
              <p className="ios-caption text-muted-foreground mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI will estimate calories for you
              </p>
            )}
          </div>

          {/* Meal time */}
          <Select value={mealTime} onValueChange={setMealTime} disabled={createMealMutation.isPending}>
            <SelectTrigger className="min-h-touch">
              <SelectValue placeholder="Meal time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
              <SelectItem value="lunch">☀️ Lunch</SelectItem>
              <SelectItem value="dinner">🌙 Dinner</SelectItem>
              <SelectItem value="snack">🍿 Snack</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Manual entry option */}
          {isManual && (
            <div>
              <Input
                type="number"
                placeholder="Calories (optional)"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                disabled={createMealMutation.isPending}
                className="ios-body min-h-touch"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 ios-press min-h-touch"
              disabled={createMealMutation.isPending || !name.trim()}
            >
              {createMealMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Estimating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Log Meal
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManual(!isManual)}
              disabled={createMealMutation.isPending}
              className="ios-press min-h-touch px-4"
            >
              {isManual ? 'AI Mode' : 'Manual'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
