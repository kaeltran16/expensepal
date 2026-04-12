import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateRoutineTemplateSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const timeOfDay = searchParams.get('time_of_day')

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
    return NextResponse.json({ error: 'Failed to fetch routine templates' }, { status: 500 })
  }

  return NextResponse.json({
    templates: data || [],
  })
})

export const POST = withAuthAndValidation(CreateRoutineTemplateSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('routine_templates')
    .insert({
      user_id: user.id,
      name: validatedData.name,
      description: validatedData.description,
      icon: validatedData.icon,
      time_of_day: validatedData.time_of_day,
      estimated_minutes: validatedData.estimated_minutes,
      steps: validatedData.steps || [],
      tags: validatedData.tags,
      frequency: validatedData.frequency || { type: 'daily' },
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating routine template:', error)
    return NextResponse.json({ error: 'Failed to create routine template' }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
})
