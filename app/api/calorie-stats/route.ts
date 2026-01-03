import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createMealQuery } from '@/lib/api/query-builder'
import type { Database } from '@/lib/supabase/database.types'

type Meal = Database['public']['Tables']['meals']['Row']

export const dynamic = 'force-dynamic'

// GET /api/calorie-stats - Get calorie statistics
export const GET = withAuth(async (request: NextRequest, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const timezoneOffset = parseInt(searchParams.get('timezoneOffset') || '0', 10)

  // Default to last 14 days if no dates provided
  const end = endDate || new Date().toISOString()
  const start =
    startDate ||
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch meals using query builder
  const { data: meals, error } = await createMealQuery(supabase, user.id)
    .byDateRange(start, end)
    .orderByDate(true) // ascending
    .execute()

  if (error) {
    throw new Error(error.message)
  }

    // Calculate statistics
    const stats = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mealCount: meals?.length || 0,
      averageCaloriesPerDay: 0,
      byMealTime: {
        breakfast: { count: 0, calories: 0 },
        lunch: { count: 0, calories: 0 },
        dinner: { count: 0, calories: 0 },
        snack: { count: 0, calories: 0 },
        other: { count: 0, calories: 0 },
      },
      byDate: {} as Record<string, { calories: number; protein: number; carbs: number; fat: number; meals: number }>,
    }

    meals?.forEach((meal: Meal) => {
      stats.totalCalories += meal.calories
      stats.totalProtein += meal.protein || 0
      stats.totalCarbs += meal.carbs || 0
      stats.totalFat += meal.fat || 0

      // By meal time
      const mealTime = (meal.meal_time || 'other') as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
      if (stats.byMealTime[mealTime]) {
        stats.byMealTime[mealTime].count++
        stats.byMealTime[mealTime].calories += meal.calories
      }

      // By date
      // Convert UTC date to user's local time for correct grouping
      const mealDate = new Date(meal.meal_date)
      // timezoneOffset is in minutes (e.g. -420 for UTC+7, 300 for UTC-5)
      // We subtract the offset because JS getTimezoneOffset returns positive for West, negative for East
      // But here we expect the client to pass the offset in minutes.
      // Standard JS: new Date().getTimezoneOffset() -> -420 for UTC+7.
      // So to get local time: UTC time - (offset * 60 * 1000)
      const localDate = new Date(mealDate.getTime() - (timezoneOffset * 60 * 1000))
      const date = localDate.toISOString().split('T')[0]

      if (date) {
        if (!stats.byDate[date]) {
          stats.byDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
        }
        stats.byDate[date].calories += meal.calories
        stats.byDate[date].protein += meal.protein || 0
        stats.byDate[date].carbs += meal.carbs || 0
        stats.byDate[date].fat += meal.fat || 0
        stats.byDate[date].meals++
      }
    })

  // Calculate average per day
  const days = Object.keys(stats.byDate).length
  stats.averageCaloriesPerDay = days > 0 ? Math.round(stats.totalCalories / days) : 0

  return NextResponse.json(stats)
})
