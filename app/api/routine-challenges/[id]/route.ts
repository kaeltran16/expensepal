import { NextRequest, NextResponse } from 'next/server'
import { withAuthParamsAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { ChallengeActionSchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    ChallengeActionSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()
      const challengeId = params.id

      if (validatedData.action === 'claim') {
        const { data: progress, error: progressError } = await supabase
          .from('user_challenge_progress')
          .select('*, routine_challenges(*)')
          .eq('user_id', user.id)
          .eq('challenge_id', challengeId)
          .single()

        if (progressError || !progress) {
          return NextResponse.json({ error: 'Progress not found' }, { status: 404 })
        }

        if (!progress.is_completed) {
          return NextResponse.json({ error: 'Challenge not completed' }, { status: 400 })
        }

        if (progress.xp_claimed) {
          return NextResponse.json({ error: 'Already claimed' }, { status: 400 })
        }

        const { error: claimError } = await supabase
          .from('user_challenge_progress')
          .update({ xp_claimed: true })
          .eq('id', progress.id)

        if (claimError) {
          console.error('Failed to claim challenge reward:', claimError)
          throw new Error('Failed to claim challenge reward')
        }

        const xpReward = (progress.routine_challenges as { xp_reward?: number })?.xp_reward || 0

        const { data: stats } = await supabase
          .from('user_routine_stats')
          .select('total_xp')
          .eq('user_id', user.id)
          .single()

        await supabase
          .from('user_routine_stats')
          .upsert(
            {
              user_id: user.id,
              total_xp: (stats?.total_xp || 0) + xpReward,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        return NextResponse.json({
          success: true,
          xp_earned: xpReward,
        })
      }

      const incrementBy = validatedData.increment_by || 1

      const { data: existing } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single()

      const { data: challenge } = await supabase
        .from('routine_challenges')
        .select('requirement_value')
        .eq('id', challengeId)
        .single()

      const newProgress = (existing?.current_progress || 0) + incrementBy
      const isCompleted = challenge && newProgress >= challenge.requirement_value

      const { data, error } = await supabase
        .from('user_challenge_progress')
        .upsert(
          {
            user_id: user.id,
            challenge_id: challengeId,
            current_progress: newProgress,
            is_completed: isCompleted,
            completed_at: isCompleted && !existing?.is_completed ? new Date().toISOString() : existing?.completed_at,
          },
          { onConflict: 'user_id,challenge_id' }
        )
        .select()
        .single()

      if (error) {
        console.error('Failed to update challenge progress:', error)
        throw new Error('Failed to update challenge progress')
      }

      return NextResponse.json({
        progress: data,
        justCompleted: isCompleted && !existing?.is_completed,
      })
    }
  )(request, context)
}
