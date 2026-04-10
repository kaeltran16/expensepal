import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateWorkoutTemplateSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (request: NextRequest, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch workout templates:', error)
    throw new Error('Failed to fetch workout templates')
  }

  return NextResponse.json({
    templates: data || [],
  })
})

export const POST = withAuthAndValidation(
  CreateWorkoutTemplateSchema,
  async (request: NextRequest, user, validatedData) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('workout_templates')
      .insert({
        ...validatedData,
        user_id: user.id,
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create workout template:', error)
      throw new Error('Failed to create workout template')
    }

    return NextResponse.json({ template: data })
  }
)
