import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateRoutineCompletionSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkNewAchievements } from '@/lib/routine-achievements'
import { checkLevelUp, getLevelForXP } from '@/lib/routine-gamification'
import { sendPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('routine_completions')
    .select('*, routine_templates(*)')
    .eq('user_id', user.id)
    .order('routine_date', { ascending: false })
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('routine_date', startDate)
  }
  if (endDate) {
    query = query.lte('routine_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching routine completions:', error)
    return NextResponse.json({ error: 'Failed to fetch routine completions' }, { status: 500 })
  }

  return NextResponse.json({
    completions: data || [],
  })
})

export const POST = withAuthAndValidation(CreateRoutineCompletionSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const [prevStatsResult, prevStreakResult] = await Promise.all([
    supabase.from('user_routine_stats').select('*').eq('user_id', user.id).single(),
    supabase.from('user_routine_streaks').select('*').eq('user_id', user.id).single(),
  ])
  const prevStats = prevStatsResult.data
  const prevStreak = prevStreakResult.data

  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      user_id: user.id,
      template_id: validatedData.template_id,
      routine_date: validatedData.routine_date || new Date().toISOString().split('T')[0],
      time_of_day: validatedData.time_of_day,
      started_at: validatedData.started_at,
      completed_at: validatedData.completed_at,
      duration_minutes: validatedData.duration_minutes,
      steps_completed: validatedData.steps_completed,
      xp_earned: validatedData.xp_earned || 0,
      bonus_xp: validatedData.bonus_xp || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating routine completion:', error)
    return NextResponse.json({ error: 'Failed to create routine completion' }, { status: 500 })
  }

  const [newStatsResult, newStreakResult] = await Promise.all([
    supabase.from('user_routine_stats').select('*').eq('user_id', user.id).single(),
    supabase.from('user_routine_streaks').select('*').eq('user_id', user.id).single(),
  ])
  const newStats = newStatsResult.data
  const newStreak = newStreakResult.data

  const newAchievements = checkNewAchievements(prevStats, prevStreak, newStats, newStreak)
  const previousXp = prevStats?.total_xp ?? 0
  const newXp = newStats?.total_xp ?? 0
  const levelUp = checkLevelUp(previousXp, newXp)

  const notifications: Promise<unknown>[] = []

  for (const achievement of newAchievements) {
    notifications.push(
      sendPushNotification(user.id, {
        title: `${achievement.icon} Achievement Unlocked!`,
        body: `${achievement.name} - ${achievement.description}`,
        tag: `achievement-${achievement.id}`,
        url: '/',
      })
    )
  }

  if (levelUp.didLevelUp) {
    const newLevelInfo = getLevelForXP(newXp)
    notifications.push(
      sendPushNotification(user.id, {
        title: 'Level Up!',
        body: `Level ${levelUp.newLevel} - ${newLevelInfo.title}!`,
        tag: `level-up-${levelUp.newLevel}`,
        url: '/',
      })
    )
  }

  if (notifications.length > 0) {
    Promise.allSettled(notifications).catch(() => {})
  }

  return NextResponse.json({
    completion: data,
    newAchievements,
    levelUp: levelUp.didLevelUp ? levelUp : null,
  }, { status: 201 })
})
