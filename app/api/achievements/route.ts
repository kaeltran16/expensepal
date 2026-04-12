import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { getAchievementById } from '@/lib/achievements'
import { UnlockAchievementSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()

  const { data: achievements, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }

  const enrichedAchievements = (achievements || []).map(a => ({
    ...a,
    details: getAchievementById(a.achievement_type),
  }))

  return NextResponse.json({ achievements: enrichedAchievements })
})

export const POST = withAuthAndValidation(
  UnlockAchievementSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const achievement = getAchievementById(validatedData.achievementType)
    if (!achievement) {
      return NextResponse.json({ error: 'Invalid achievement type' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', user.id)
      .eq('achievement_type', validatedData.achievementType)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Achievement already unlocked', achievement })
    }

    const { data: newAchievement, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: user.id,
        achievement_type: validatedData.achievementType,
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to unlock achievement:', error)
      return NextResponse.json({ error: 'Failed to unlock achievement' }, { status: 500 })
    }

    return NextResponse.json({
      achievement: { ...newAchievement, ...achievement },
      isNew: true,
    })
  }
)
