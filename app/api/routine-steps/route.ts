import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCustomRoutineStepSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

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

export const POST = withAuthAndValidation(CreateCustomRoutineStepSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('custom_routine_steps')
    .insert({
      user_id: user.id,
      name: validatedData.name,
      description: validatedData.description,
      tips: validatedData.tips,
      image_url: validatedData.image_url,
      gif_url: validatedData.gif_url,
      category: validatedData.category,
      duration_seconds: validatedData.duration_seconds || 60,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating custom routine step:', error)
    return NextResponse.json({ error: 'Failed to create custom routine step' }, { status: 500 })
  }

  return NextResponse.json({ step: data }, { status: 201 })
})
