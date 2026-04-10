import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateCardioPlanSchema = z.object({
  exercise_type: z.enum(['treadmill', 'cycling', 'rowing']).default('treadmill'),
  name: z.string().min(1),
  goal: z.string().min(1),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
  total_weeks: z.number().int().positive(),
  sessions_per_week: z.number().int().min(2).max(5),
  plan_data: z.object({
    weeks: z.array(z.object({
      week_number: z.number(),
      sessions: z.array(z.object({
        session_number: z.number(),
        segments: z.array(z.object({
          type: z.enum(['warm_up', 'main', 'cool_down', 'interval']),
          duration_seconds: z.number().positive(),
          speed: z.number().nonnegative(),
          settings: z.record(z.string(), z.number()).default({}),
        })),
      })),
    })),
    summary: z.string().optional(),
  }),
})

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('cardio_plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch cardio plans:', error)
    return NextResponse.json({ error: 'Failed to fetch cardio plans' }, { status: 500 })
  }

  return NextResponse.json({ plans: data || [] })
})

export const POST = withAuthAndValidation(CreateCardioPlanSchema, async (request, user, body) => {
  const supabase = createClient()

  await supabase
    .from('cardio_plans')
    .update({ status: 'paused' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('cardio_plans')
    .insert({
      user_id: user.id,
      exercise_type: body.exercise_type,
      name: body.name,
      goal: body.goal,
      fitness_level: body.fitness_level,
      total_weeks: body.total_weeks,
      sessions_per_week: body.sessions_per_week,
      plan_data: body.plan_data,
      status: 'active',
      current_week: 1,
      current_session: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create cardio plan:', error)
    return NextResponse.json({ error: 'Failed to create cardio plan' }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
})
