import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-steps - list all routine steps (default + custom)
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  // Fetch default steps
  let defaultQuery = supabase
    .from('routine_steps')
    .select('*')
    .order('category')
    .order('name')

  if (category) {
    defaultQuery = defaultQuery.eq('category', category)
  }

  const { data: defaultSteps, error: defaultError } = await defaultQuery

  if (defaultError) {
    console.error('Error fetching default routine steps:', defaultError)
    return NextResponse.json({ error: defaultError.message }, { status: 500 })
  }

  // Fetch user's custom steps
  let customQuery = supabase
    .from('custom_routine_steps')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (category) {
    customQuery = customQuery.eq('category', category)
  }

  const { data: customSteps, error: customError } = await customQuery

  if (customError) {
    console.error('Error fetching custom routine steps:', customError)
    return NextResponse.json({ error: customError.message }, { status: 500 })
  }

  return NextResponse.json({
    steps: defaultSteps || [],
    customSteps: customSteps || [],
  })
})

// POST /api/routine-steps - create a custom step
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('custom_routine_steps')
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description,
      tips: body.tips,
      image_url: body.image_url,
      gif_url: body.gif_url,
      category: body.category,
      duration_seconds: body.duration_seconds || 60,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating custom routine step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ step: data }, { status: 201 })
})
