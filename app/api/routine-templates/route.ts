import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-templates - list all templates (default + user's)
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const timeOfDay = searchParams.get('time_of_day')

  // RLS handles filtering - users see defaults + their own
  let query = supabase
    .from('routine_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (timeOfDay) {
    query = query.eq('time_of_day', timeOfDay)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching routine templates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    templates: data || [],
  })
})

// POST /api/routine-templates - create a template
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('routine_templates')
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description,
      icon: body.icon,
      time_of_day: body.time_of_day,
      estimated_minutes: body.estimated_minutes,
      steps: body.steps || [],
      tags: body.tags,
      frequency: body.frequency || { type: 'daily' },
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating routine template:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
})
