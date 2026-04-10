import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCustomExerciseSchema, UpdateCustomExerciseSchema } from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/database.types'

type CustomExerciseUpdate = Partial<Database['public']['Tables']['custom_exercises']['Update']>

export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()
  const { data: customExercises, error } = await supabase
    .from('custom_exercises')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching custom exercises:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom exercises' },
      { status: 500 }
    )
  }

  return NextResponse.json({ customExercises })
})

export const POST = withAuthAndValidation(
  CreateCustomExerciseSchema,
  async (_request, user, validatedData) => {
    const supabase = createClient()
    const { data: customExercise, error } = await supabase
      .from('custom_exercises')
      .insert({
        user_id: user.id,
        ...validatedData,
        muscle_groups: validatedData.muscle_group ? [validatedData.muscle_group] : [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom exercise:', error)
      return NextResponse.json(
        { error: 'Failed to create custom exercise' },
        { status: 500 }
      )
    }

    return NextResponse.json({ customExercise }, { status: 201 })
  }
)

export const PUT = withAuthAndValidation(UpdateCustomExerciseSchema, async (request, user, validatedData) => {
  const supabase = createClient()
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'id is required' },
      { status: 400 }
    )
  }

  const { data: existing, error: fetchError } = await supabase
    .from('custom_exercises')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'Custom exercise not found' },
      { status: 404 }
    )
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  const updates: CustomExerciseUpdate = {}
  if (validatedData.name !== undefined) updates.name = validatedData.name.trim()
  if (validatedData.muscle_group !== undefined) updates.muscle_groups = [validatedData.muscle_group]
  if (validatedData.equipment !== undefined) updates.equipment = validatedData.equipment
  if (validatedData.instructions !== undefined) updates.instructions = validatedData.instructions

  const { data: customExercise, error } = await supabase
    .from('custom_exercises')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating custom exercise:', error)
    return NextResponse.json(
      { error: 'Failed to update custom exercise' },
      { status: 500 }
    )
  }

  return NextResponse.json({ customExercise })
})

export const DELETE = withAuth(async (request, user) => {
  const supabase = createClient()
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'id is required' },
      { status: 400 }
    )
  }

  const { data: existing, error: fetchError } = await supabase
    .from('custom_exercises')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'Custom exercise not found' },
      { status: 404 }
    )
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('custom_exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting custom exercise:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom exercise' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
