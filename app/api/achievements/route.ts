import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { getAchievementById } from '@/lib/achievements'

// GET /api/achievements - get user's unlocked achievements
export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()

  const { data: achievements, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })

  if (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with achievement details
  const enrichedAchievements = (achievements || []).map(a => ({
    ...a,
    details: getAchievementById(a.achievement_type),
  }))

  return NextResponse.json({ achievements: enrichedAchievements })
})

// POST /api/achievements - unlock a specific achievement
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const { achievementType } = await request.json()

  if (!achievementType) {
    return NextResponse.json({ error: 'achievementType is required' }, { status: 400 })
  }

  const achievement = getAchievementById(achievementType)
  if (!achievement) {
    return NextResponse.json({ error: 'Invalid achievement type' }, { status: 400 })
  }

  // Check if already unlocked
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', user.id)
    .eq('achievement_type', achievementType)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Achievement already unlocked', achievement })
  }

  // Unlock achievement
  const { data: newAchievement, error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: user.id,
      achievement_type: achievementType,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error unlocking achievement:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    achievement: { ...newAchievement, ...achievement },
    isNew: true,
  })
})
