import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateWorkoutTemplateSchema } from '@/lib/api/schemas'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateWorkoutTemplateSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

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

      const updatedData = {
        name: validatedData.name ?? existingTemplate.name,
        description: validatedData.description ?? existingTemplate.description,
        difficulty: validatedData.difficulty ?? existingTemplate.difficulty,
        duration_minutes: validatedData.duration_minutes ?? existingTemplate.duration_minutes,
        exercises: validatedData.exercises ?? existingTemplate.exercises,
      }

      if (existingTemplate.is_default && existingTemplate.user_id === null) {
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
          console.error('Failed to create template copy:', createError)
          throw new Error('Failed to create template copy')
        }

        return NextResponse.json({
          template: newTemplate,
          message: 'Created a personal copy of the system template'
        })
      }

      if (existingTemplate.user_id !== user.id) {
        return NextResponse.json(
          { error: 'unauthorized - you can only edit your own templates' },
          { status: 403 }
        )
      }

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
        console.error('Failed to update workout template:', error)
        throw new Error('Failed to update workout template')
      }

      return NextResponse.json({ template: data })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Failed to delete workout template:', error)
      throw new Error('Failed to delete workout template')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
