import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CardioSegmentInputSchema = z.object({
  segment_order: z.number().int().nonnegative(),
  segment_type: z.enum(['warm_up', 'main', 'cool_down', 'interval']),
  duration_seconds: z.number().positive(),
  distance: z.number().optional(),
  speed: z.number().optional(),
  settings: z.record(z.string(), z.number()).optional(),
  is_planned: z.boolean(),
  completed: z.boolean(),
})

const CreateCardioSessionSchema = z.object({
  plan_id: z.string().uuid().optional(),
  exercise_type: z.enum(['treadmill', 'cycling', 'rowing']).default('treadmill'),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime(),
  duration_minutes: z.number().positive(),
  total_distance: z.number().optional(),
  avg_speed: z.number().optional(),
  plan_week: z.number().int().positive().optional(),
  plan_session: z.number().int().positive().optional(),
  notes: z.string().optional(),
  segments: z.array(CardioSegmentInputSchema).default([]),
})

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const startDate = searchParams.get('startDate')

  let query = supabase
    .from('cardio_sessions')
    .select('*, cardio_segments(*)')
    .order('session_date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('session_date', startDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('error fetching cardio sessions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
})

export const POST = withAuthAndValidation(CreateCardioSessionSchema, async (request, user, body) => {
  const supabase = createClient()

  const { data: session, error: sessionError } = await supabase
    .from('cardio_sessions')
    .insert({
      user_id: user.id,
      plan_id: body.plan_id || null,
      exercise_type: body.exercise_type,
      session_date: new Date(body.started_at).toISOString().split('T')[0],
      started_at: body.started_at,
      completed_at: body.completed_at,
      duration_minutes: body.duration_minutes,
      total_distance: body.total_distance || null,
      avg_speed: body.avg_speed || null,
      plan_week: body.plan_week || null,
      plan_session: body.plan_session || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (sessionError) {
    console.error('error creating cardio session:', sessionError)
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  const pendingOps: Promise<unknown>[] = []

  if (body.segments.length > 0) {
    const segmentsToInsert = body.segments.map((seg) => ({
      session_id: session.id,
      segment_order: seg.segment_order,
      segment_type: seg.segment_type,
      duration_seconds: seg.duration_seconds,
      distance: seg.distance || null,
      speed: seg.speed || null,
      settings: seg.settings || {},
      is_planned: seg.is_planned,
      completed: seg.completed,
    }))

    pendingOps.push(
      (async () => {
        const { error } = await supabase.from('cardio_segments').insert(segmentsToInsert)
        if (error) console.error('error creating cardio segments:', error)
      })()
    )
  }

  if (body.plan_id && body.plan_week && body.plan_session) {
    pendingOps.push(
      (async () => {
        const { data: plan } = await supabase
          .from('cardio_plans')
          .select('total_weeks, sessions_per_week')
          .eq('id', body.plan_id!)
          .single()

        if (plan) {
          const isLastSession = body.plan_session! >= plan.sessions_per_week
          const isLastWeek = body.plan_week! >= plan.total_weeks

          if (isLastSession && isLastWeek) {
            await supabase
              .from('cardio_plans')
              .update({ status: 'completed', current_week: body.plan_week, current_session: body.plan_session })
              .eq('id', body.plan_id!)
          } else if (isLastSession) {
            await supabase
              .from('cardio_plans')
              .update({ current_week: body.plan_week! + 1, current_session: 1 })
              .eq('id', body.plan_id!)
          } else {
            await supabase
              .from('cardio_plans')
              .update({ current_session: body.plan_session! + 1 })
              .eq('id', body.plan_id!)
          }
        }
      })()
    )
  }

  await Promise.all(pendingOps)

  return NextResponse.json({ session })
})
