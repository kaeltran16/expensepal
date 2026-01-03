import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

// GET all savings goals
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ goals: data })
})

// POST create new goal
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('savings_goals')
    .insert([
      {
        user_id: user.id,
        name: body.name,
        target_amount: body.targetAmount,
        current_amount: body.currentAmount || 0,
        deadline: body.deadline,
        icon: body.icon || '🎯',
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ goal: data[0] }, { status: 201 })
})
