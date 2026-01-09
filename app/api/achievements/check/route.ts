import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { checkAchievements, getAchievementById } from '@/lib/achievements'

// POST /api/achievements/check - check and unlock new achievements
export const POST = withAuth(async (_request, user) => {
  const supabase = createClient()

  // Get user's current stats
  const [
    { data: streak },
    { data: achievements },
    { data: workouts },
    { data: personalRecords },
  ] = await Promise.all([
    supabase
      .from('user_workout_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_achievements')
      .select('achievement_type')
      .eq('user_id', user.id),
    supabase
      .from('workouts')
      .select('total_volume')
      .eq('user_id', user.id),
    supabase
      .from('personal_records')
      .select('id')
      .eq('user_id', user.id),
  ])

  // Calculate stats
  const totalWorkouts = streak?.total_workouts || workouts?.length || 0
  const currentStreak = streak?.current_streak || 0
  const longestStreak = streak?.longest_streak || 0
  const totalPRs = personalRecords?.length || 0
  const totalVolume = workouts?.reduce((sum, w) => sum + (w.total_volume || 0), 0) || 0

  // Get the latest workout volume if available
  const { data: latestWorkout } = await supabase
    .from('workouts')
    .select('total_volume')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  const existingAchievements = (achievements || []).map(a => a.achievement_type)

  // Check which achievements should be unlocked
  const newAchievementsToUnlock = checkAchievements(
    {
      totalWorkouts,
      currentStreak,
      longestStreak,
      totalPRs,
      totalVolume,
      latestWorkoutVolume: latestWorkout?.total_volume,
    },
    existingAchievements
  )

  // Unlock new achievements
  const unlockedAchievements = []
  for (const achievement of newAchievementsToUnlock) {
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: user.id,
        achievement_type: achievement.id,
        metadata: {},
      })

    if (!error) {
      unlockedAchievements.push(achievement)
    }
  }

  return NextResponse.json({
    newAchievements: unlockedAchievements,
    stats: {
      totalWorkouts,
      currentStreak,
      longestStreak,
      totalPRs,
      totalVolume,
    },
  })
})
