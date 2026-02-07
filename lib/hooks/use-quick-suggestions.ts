'use client'

import { useMemo } from 'react'
import { useExpenses } from './use-expenses'
import { useMeals } from './use-meals'

interface QuickSuggestion {
  text: string
  intent: 'expense' | 'meal'
}

const FALLBACK_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'coffee 45k', intent: 'expense' },
  { text: 'grab to work 32k', intent: 'expense' },
  { text: 'had pho for lunch', intent: 'meal' },
]

type TimePeriod = 'morning' | 'midday' | 'afternoon' | 'evening'

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  return 'evening'
}

const MEAL_TIME_MAP: Record<TimePeriod, string[]> = {
  morning: ['breakfast', 'snack'],
  midday: ['lunch'],
  afternoon: ['snack'],
  evening: ['dinner', 'snack'],
}

/** Format amount as shorthand: 45000 → "45k", 1500000 → "1.5m" */
function formatShortAmount(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    return m % 1 === 0 ? `${m}m` : `${m.toFixed(1)}m`
  }
  if (amount >= 1000) {
    const k = Math.round(amount / 1000)
    return `${k}k`
  }
  return String(Math.round(amount))
}

/**
 * Returns personalized quick-add suggestions based on the user's
 * habits at the current time of day and day of week.
 */
export function useQuickSuggestions(maxItems = 5) {
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])

  const { data: expenses } = useExpenses(
    { startDate: thirtyDaysAgo, limit: 200 },
    { staleTime: 12 * 60 * 60 * 1000 }
  )

  const { data: meals } = useMeals(
    { startDate: thirtyDaysAgo, limit: 200 },
    { staleTime: 12 * 60 * 60 * 1000 }
  )

  const suggestions = useMemo<QuickSuggestion[]>(() => {
    const now = new Date()
    const currentPeriod = getTimePeriod(now.getHours())
    const isWeekend = now.getDay() === 0 || now.getDay() === 6

    const items: QuickSuggestion[] = []

    // --- Expense suggestions based on time-of-day habits ---
    if (expenses && expenses.length > 0) {
      // Group expenses by merchant, filtered to matching time period
      const merchantHabits = new Map<string, { total: number; count: number }>()

      for (const exp of expenses) {
        const createdAt = exp.created_at ? new Date(exp.created_at) : null
        if (!createdAt) continue

        const expPeriod = getTimePeriod(createdAt.getHours())
        const expIsWeekend = createdAt.getDay() === 0 || createdAt.getDay() === 6

        // Score: same time period is a must, same weekday/weekend type is a bonus
        if (expPeriod !== currentPeriod) continue

        // Boost weekend/weekday match by counting them more
        const weight = expIsWeekend === isWeekend ? 2 : 1
        const merchant = exp.merchant
        const existing = merchantHabits.get(merchant)
        if (existing) {
          existing.total += exp.amount
          existing.count += weight
        } else {
          merchantHabits.set(merchant, { total: exp.amount, count: weight })
        }
      }

      // Sort by frequency (weighted), take top items
      const topMerchants = [...merchantHabits.entries()]
        .filter(([, v]) => v.count >= 2) // at least appeared twice in this time slot
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)

      for (const [merchant, { total, count }] of topMerchants) {
        // Use the real count (unweighted) for average
        const rawCount = [...(expenses || [])].filter((e) => {
          const c = e.created_at ? new Date(e.created_at) : null
          return c && getTimePeriod(c.getHours()) === currentPeriod && e.merchant === merchant
        }).length
        const avg = Math.round(total / rawCount)
        items.push({
          text: `${merchant.toLowerCase()} ${formatShortAmount(avg)}`,
          intent: 'expense',
        })
      }
    }

    // --- Meal suggestions based on time-of-day habits ---
    if (meals && meals.length > 0) {
      const relevantMealTimes = MEAL_TIME_MAP[currentPeriod]

      // Count meals matching the current time period
      const mealHabits = new Map<string, { count: number; mealTime: string }>()

      for (const meal of meals) {
        const mealTime = meal.meal_time || 'snack'
        if (!relevantMealTimes.includes(mealTime)) continue

        const name = meal.name?.toLowerCase()
        if (!name) continue

        const existing = mealHabits.get(name)
        if (existing) {
          existing.count++
        } else {
          mealHabits.set(name, { count: 1, mealTime })
        }
      }

      const topMeals = [...mealHabits.entries()]
        .filter(([, v]) => v.count >= 2)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 2)

      for (const [name, { mealTime }] of topMeals) {
        const timeLabel = mealTime === 'snack' ? '' : ` for ${mealTime}`
        items.push({
          text: `had ${name}${timeLabel}`,
          intent: 'meal',
        })
      }
    }

    // --- Transport suggestion during commute hours ---
    if (currentPeriod === 'morning' || (currentPeriod === 'afternoon' && !isWeekend)) {
      if (expenses && expenses.length > 0) {
        const transportExpenses = expenses.filter((e) => e.category === 'Transport')
        const transportMerchants = new Map<string, { total: number; count: number }>()

        for (const exp of transportExpenses) {
          const m = exp.merchant
          const existing = transportMerchants.get(m)
          if (existing) {
            existing.total += exp.amount
            existing.count++
          } else {
            transportMerchants.set(m, { total: exp.amount, count: 1 })
          }
        }

        const topTransport = [...transportMerchants.entries()]
          .filter(([, v]) => v.count >= 2)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 1)

        for (const [merchant, { total, count }] of topTransport) {
          const avg = Math.round(total / count)
          const text = `${merchant.toLowerCase()} ${formatShortAmount(avg)}`
          // Avoid duplicates from the general expense suggestions
          if (!items.some((i) => i.text === text)) {
            items.push({ text, intent: 'expense' })
          }
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const unique = items.filter((item) => {
      if (seen.has(item.text)) return false
      seen.add(item.text)
      return true
    })

    return unique.length > 0 ? unique.slice(0, maxItems) : FALLBACK_SUGGESTIONS
  }, [expenses, meals, maxItems])

  return suggestions
}
