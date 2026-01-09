import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

// GET /api/streaks - get user's workout streak
export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()

  const { data: streak, error } = await supabase
    .from('user_workout_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching streak:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ streak: streak || null })
})

// POST /api/streaks - update streak after completing a workout
export const POST = withAuth(async (_request, user) => {
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Get current streak data
  const { data: existingStreak } = await supabase
    .from('user_workout_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!existingStreak) {
    // Create new streak record
    const { data: newStreak, error: createError } = await supabase
      .from('user_workout_streaks')
      .insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_workout_date: todayStr,
        streak_start_date: todayStr,
        total_workouts: 1,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating streak:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ streak: newStreak, isNew: true })
  }

  // Calculate updated streak
  const lastWorkoutDate = existingStreak.last_workout_date
    ? new Date(existingStreak.last_workout_date)
    : null

  let newCurrentStreak = existingStreak.current_streak
  let newStreakStartDate = existingStreak.streak_start_date

  if (lastWorkoutDate) {
    lastWorkoutDate.setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) {
      // Same day - no streak change, just increment total
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      newCurrentStreak += 1
    } else if (daysDiff === 2) {
      // One rest day allowed - streak continues
      newCurrentStreak += 1
    } else {
      // Streak broken - reset
      newCurrentStreak = 1
      newStreakStartDate = todayStr
    }
  } else {
    newCurrentStreak = 1
    newStreakStartDate = todayStr
  }

  const newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak)

  // Update streak record
  const { data: updatedStreak, error: updateError } = await supabase
    .from('user_workout_streaks')
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_workout_date: todayStr,
      streak_start_date: newStreakStartDate,
      total_workouts: existingStreak.total_workouts + 1,
    })
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating streak:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    streak: updatedStreak,
    streakIncreased: newCurrentStreak > existingStreak.current_streak,
  })
})
