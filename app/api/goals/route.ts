import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateGoalInputSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }

  return NextResponse.json({ goals: data })
})

export const POST = withAuthAndValidation(CreateGoalInputSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('savings_goals')
    .insert([
      {
        user_id: user.id,
        name: validatedData.name,
        target_amount: validatedData.targetAmount,
        current_amount: validatedData.currentAmount,
        deadline: validatedData.deadline,
        icon: validatedData.icon,
      },
    ])
    .select()

  if (error) {
    console.error('Failed to create goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }

  return NextResponse.json({ goal: data[0] }, { status: 201 })
})
