import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreatePersonalRecordSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const exerciseId = searchParams.get('exerciseId')

  let query = supabase
    .from('personal_records')
    .select('*, exercises(*)')
    .order('achieved_at', { ascending: false })

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch personal records:', error)
    return NextResponse.json({ error: 'Failed to fetch personal records' }, { status: 500 })
  }

  return NextResponse.json({ personalRecords: data || [] })
})

export const POST = withAuthAndValidation(CreatePersonalRecordSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('personal_records')
    .upsert({
      user_id: user.id,
      exercise_id: validatedData.exercise_id,
      record_type: validatedData.record_type,
      value: validatedData.value,
      unit: validatedData.unit,
      achieved_at: validatedData.achieved_at || new Date().toISOString(),
      workout_exercise_id: validatedData.workout_exercise_id,
      notes: validatedData.notes,
    }, {
      onConflict: 'user_id,exercise_id,record_type',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create personal record:', error)
    return NextResponse.json({ error: 'Failed to create personal record' }, { status: 500 })
  }

  return NextResponse.json({ personalRecord: data })
})
