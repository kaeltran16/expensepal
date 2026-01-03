import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCustomExerciseSchema } from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/database.types'

type CustomExerciseUpdate = Partial<Database['public']['Tables']['custom_exercises']['Update']>

// GET /api/custom-exercises
export const GET = withAuth(async (_request, user) => {
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

// POST /api/custom-exercises
export const POST = withAuthAndValidation(
  CreateCustomExerciseSchema,
  async (_request, user, validatedData) => {
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

// PUT /api/custom-exercises?id=...
export const PUT = withAuth(async (request, user) => {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'id is required' },
      { status: 400 }
    )
  }

  // Verify ownership
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

  const body = await request.json()
  const {
    name,
    description,
    muscle_groups,
    equipment,
    difficulty,
    video_url,
    image_url,
    instructions,
    tips
  } = body

  const updates: CustomExerciseUpdate = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description
  if (muscle_groups !== undefined) updates.muscle_groups = muscle_groups
  if (equipment !== undefined) updates.equipment = equipment
  if (difficulty !== undefined) updates.difficulty = difficulty
  if (video_url !== undefined) updates.video_url = video_url
  if (image_url !== undefined) updates.image_url = image_url
  if (instructions !== undefined) updates.instructions = instructions
  if (tips !== undefined) updates.tips = tips

  const { data: customExercise, error } = await supabase
    .from('custom_exercises')
    .update(updates)
    .eq('id', id)
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

// DELETE /api/custom-exercises?id=...
export const DELETE = withAuth(async (request, user) => {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'id is required' },
      { status: 400 }
    )
  }

  // Verify ownership
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

  if (error) {
    console.error('Error deleting custom exercise:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom exercise' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
