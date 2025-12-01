import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// PUT /api/workout-templates/[id] - update workout template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // update template (only if user owns it)
    const { data, error } = await supabaseAdmin
      .from('workout_templates')
      .update({
        name: body.name,
        description: body.description,
        difficulty: body.difficulty,
        duration_minutes: body.duration_minutes,
        exercises: body.exercises,
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

    if (!data) {
      return NextResponse.json(
        { error: 'template not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('error in PUT /api/workout-templates/[id]:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/workout-templates/[id] - delete workout template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    // delete template (only if user owns it and it's not default)
    const { error } = await supabaseAdmin
      .from('workout_templates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_default', false)

    if (error) {
      console.error('error deleting workout template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('error in DELETE /api/workout-templates/[id]:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
