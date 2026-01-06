import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import type { User } from '@supabase/supabase-js'

// Helper function to wrap route handlers with params
function withAuthParams<TParams>(
  handler: (request: NextRequest, user: User, params: TParams) => Promise<Response>
) {
  return (request: NextRequest, context: { params: TParams }) => {
    return withAuth((req, user) => handler(req, user, context.params))(request)
  }
}

// PUT /api/workout-templates/[id] - update workout template
export const PUT = withAuthParams<{ id: string }>(async (request, user, params) => {
  const supabase = createClient()
  const body = await request.json()

  // First verify the template exists and user owns it
  const { data: existingTemplate, error: fetchError } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !existingTemplate) {
    return NextResponse.json(
      { error: 'template not found or unauthorized' },
      { status: 404 }
    )
  }

  // Merge body with existing template to handle partial updates
  const updatedData = {
    name: body.name ?? existingTemplate.name,
    description: body.description ?? existingTemplate.description,
    difficulty: body.difficulty ?? existingTemplate.difficulty,
    duration_minutes: body.duration_minutes ?? existingTemplate.duration_minutes,
    exercises: body.exercises ?? existingTemplate.exercises,
  }

  // Check if this is a default template
  if (existingTemplate.is_default && existingTemplate.user_id === null) {
    // Can't edit system templates - create a copy instead
    const { data: newTemplate, error: createError } = await supabase
      .from('workout_templates')
      .insert({
        ...updatedData,
        is_default: false,
        user_id: user.id,
        tags: existingTemplate.tags,
        target_goal: existingTemplate.target_goal,
      })
      .select()
      .single()

    if (createError) {
      console.error('error creating template copy:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({
      template: newTemplate,
      message: 'Created a personal copy of the system template'
    })
  }

  // Check if user owns this template
  if (existingTemplate.user_id !== user.id) {
    return NextResponse.json(
      { error: 'unauthorized - you can only edit your own templates' },
      { status: 403 }
    )
  }

  // Update user's own template
  const { data, error } = await supabase
    .from('workout_templates')
    .update({
      ...updatedData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('error updating workout template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
})

// DELETE /api/workout-templates/[id] - delete workout template
export const DELETE = withAuthParams<{ id: string }>(async (request, user, params) => {
  const supabase = createClient()

  // delete template
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('error deleting workout template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
