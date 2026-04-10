import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateStreakSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()

  const { data: streak, error } = await supabase
    .from('user_workout_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch streak:', error)
    return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 })
  }

  return NextResponse.json({ streak: streak || null })
})

export const POST = withAuthAndValidation(
  UpdateStreakSchema,
  async (_request, user, _validatedData) => {
    const supabase = createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const { data: existingStreak } = await supabase
      .from('user_workout_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!existingStreak) {
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
        console.error('Failed to create streak:', createError)
        return NextResponse.json({ error: 'Failed to create streak' }, { status: 500 })
      }

      return NextResponse.json({ streak: newStreak, isNew: true })
    }

    const lastWorkoutDate = existingStreak.last_workout_date
      ? new Date(existingStreak.last_workout_date)
      : null

    let newCurrentStreak = existingStreak.current_streak
    let newStreakStartDate = existingStreak.streak_start_date

    if (lastWorkoutDate) {
      lastWorkoutDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === 0) {
      } else if (daysDiff === 1 || daysDiff === 2) {
        newCurrentStreak += 1
      } else {
        newCurrentStreak = 1
        newStreakStartDate = todayStr
      }
    } else {
      newCurrentStreak = 1
      newStreakStartDate = todayStr
    }

    const newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak)

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
      console.error('Failed to update streak:', updateError)
      return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 })
    }

    return NextResponse.json({
      streak: updatedStreak,
      streakIncreased: newCurrentStreak > existingStreak.current_streak,
    })
  }
)
