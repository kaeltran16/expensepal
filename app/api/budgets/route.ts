import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateBudgetSchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)

  if (error) {
    console.error('Failed to fetch budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }

  return NextResponse.json({ budgets: data })
})

export const POST = withAuthAndValidation(CreateBudgetSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('budgets')
    .insert([
      {
        user_id: user.id,
        category: validatedData.category,
        amount: validatedData.amount,
        month: validatedData.month,
      },
    ])
    .select()

  if (error) {
    console.error('Failed to create budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }

  return NextResponse.json({ budget: data[0] }, { status: 201 })
})
