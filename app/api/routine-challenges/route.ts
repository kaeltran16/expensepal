import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  let query = supabase
    .from('routine_challenges')
    .select(`
      *,
      user_challenge_progress!left (
        current_progress,
        is_completed,
        xp_claimed,
        created_at,
        completed_at
      )
    `)
    .eq('is_active', true)
    .eq('user_challenge_progress.user_id', user.id)
    .order('challenge_type')
    .order('xp_reward', { ascending: false })

  if (type) {
    query = query.eq('challenge_type', type)
  }

  const { data: challenges, error } = await query

  if (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json({ error: 'Failed to fetch routine challenges' }, { status: 500 })
  }

  const challengesWithProgress = (challenges || []).map((challenge) => {
    const progressData = challenge.user_challenge_progress?.[0]
    const { user_challenge_progress, ...challengeData } = challenge

    return {
      ...challengeData,
      progress: progressData || {
        current_progress: 0,
        is_completed: false,
        xp_claimed: false,
      },
    }
  })

  return NextResponse.json({
    challenges: challengesWithProgress,
  })
})
