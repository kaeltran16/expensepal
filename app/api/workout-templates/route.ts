import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/workout-templates - list all workout templates (default + user's custom)
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    // fetch default templates + user's custom templates
    const { data, error } = await supabaseAdmin
      .from('workout_templates')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('error fetching workout templates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      templates: data || [],
    })
  } catch (error) {
    console.error('error in GET /api/workout-templates:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/workout-templates - create custom workout template
export async function POST(request: Request) {
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

    const { data, error } = await supabaseAdmin
      .from('workout_templates')
      .insert({
        name: body.name,
        description: body.description,
        difficulty: body.difficulty,
        duration_minutes: body.duration_minutes,
        exercises: body.exercises,
        is_default: false,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('error creating workout template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('error in POST /api/workout-templates:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
