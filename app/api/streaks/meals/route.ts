import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

/**
 * GET /api/streaks/meals
 * Calculate meal logging streak (consecutive days with at least one meal)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const timezoneOffset = searchParams.get('timezoneOffset')

  const supabase = createClient()

  // Get all unique meal dates for this user, ordered by date descending
  const { data: meals, error } = await supabase
    .from('meals')
    .select('meal_date')
    .eq('user_id', user.id)
    .order('meal_date', { ascending: false })

  if (error) {
    console.error('Error fetching meals for streak:', error)
    return NextResponse.json(
      { error: 'Failed to calculate streak' },
      { status: 500 }
    )
  }

  if (!meals || meals.length === 0) {
    return NextResponse.json({
      currentStreak: 0,
      bestStreak: 0,
      lastMealDate: null,
    })
  }

  // Get unique dates (normalize to date only)
  const uniqueDates = new Set<string>()
  meals.forEach((meal) => {
    const dateStr = new Date(meal.meal_date).toISOString().split('T')[0]
    uniqueDates.add(dateStr)
  })

  const sortedDates = Array.from(uniqueDates).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Calculate today's date (adjusted for timezone if provided)
  let today = new Date()
  if (timezoneOffset) {
    today = new Date(today.getTime() - parseInt(timezoneOffset) * 60000)
  }
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0]

  // Calculate current streak
  let currentStreak = 0
  let checkDate = sortedDates[0]

  // Streak only counts if the most recent meal is today or yesterday
  if (checkDate === todayStr || checkDate === yesterdayStr) {
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(today.getTime() - i * 86400000)
        .toISOString()
        .split('T')[0]

      // If streak started yesterday, shift expectation
      if (i === 0 && checkDate === yesterdayStr) {
        if (sortedDates[i] === yesterdayStr) {
          currentStreak++
          continue
        }
      }

      if (sortedDates.includes(expectedDate)) {
        currentStreak++
      } else if (i === 0 && sortedDates[0] === yesterdayStr) {
        // Started yesterday, check from yesterday
        currentStreak++
      } else {
        break
      }
    }
  }

  // Recalculate considering streak might start from yesterday
  currentStreak = 0
  let streakStartDate = sortedDates[0]

  if (streakStartDate === todayStr || streakStartDate === yesterdayStr) {
    currentStreak = 1
    let lastDate = new Date(streakStartDate)

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const diffDays = Math.round((lastDate.getTime() - currentDate.getTime()) / 86400000)

      if (diffDays === 1) {
        currentStreak++
        lastDate = currentDate
      } else {
        break
      }
    }
  }

  // Calculate best streak
  let bestStreak = 0
  let tempStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i])
    const prevDate = new Date(sortedDates[i - 1])
    const diffDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000)

    if (diffDays === 1) {
      tempStreak++
    } else {
      bestStreak = Math.max(bestStreak, tempStreak)
      tempStreak = 1
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak, currentStreak)

  return NextResponse.json({
    currentStreak,
    bestStreak,
    lastMealDate: sortedDates[0],
  })
})
