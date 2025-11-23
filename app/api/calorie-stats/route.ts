import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/calorie-stats - Get calorie statistics
export async function GET(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to view calorie stats.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString()
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch meals in date range FOR THIS USER ONLY
    const { data: meals, error } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('meal_date', start)
      .lte('meal_date', end)
      .order('meal_date', { ascending: true })

    if (error) {
      console.error('Error fetching meals for stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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

    meals?.forEach((meal) => {
      stats.totalCalories += meal.calories
      stats.totalProtein += meal.protein
      stats.totalCarbs += meal.carbs
      stats.totalFat += meal.fat

      // By meal time
      const mealTime = (meal.meal_time || 'other') as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
      stats.byMealTime[mealTime].count++
      stats.byMealTime[mealTime].calories += meal.calories

      // By date
      const date = meal.meal_date.split('T')[0]
      if (!stats.byDate[date]) {
        stats.byDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
      }
      stats.byDate[date].calories += meal.calories
      stats.byDate[date].protein += meal.protein
      stats.byDate[date].carbs += meal.carbs
      stats.byDate[date].fat += meal.fat
      stats.byDate[date].meals++
    })

    // Calculate average per day
    const days = Object.keys(stats.byDate).length
    stats.averageCaloriesPerDay = days > 0 ? Math.round(stats.totalCalories / days) : 0

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in GET /api/calorie-stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
