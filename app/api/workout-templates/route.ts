import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateWorkoutTemplateSchema } from '@/lib/api/schemas'

// GET /api/workout-templates - list user's workout templates
export const GET = withAuth(async (request: NextRequest, user) => {
  const supabase = createClient()

  // Fetch user's workout templates
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return NextResponse.json({
    templates: data || [],
  })
})

// POST /api/workout-templates - create workout template
export const POST = withAuthAndValidation(
  CreateWorkoutTemplateSchema,
  async (request: NextRequest, user, validatedData) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('workout_templates')
      .insert({
        ...validatedData,
        user_id: user.id,
        is_default: false, // Explicitly set as custom template
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ template: data })
  }
)
