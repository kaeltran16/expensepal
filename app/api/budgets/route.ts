import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, safeParseJSON } from '@/lib/api/middleware'

export const dynamic = 'force-dynamic'

// GET budgets for a specific month
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ budgets: data })
})

// POST create new budget
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await safeParseJSON(request)

  if (!body.category || !body.amount) {
    return NextResponse.json(
      { error: 'Missing required fields: category and amount' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert([
      {
        user_id: user.id,
        category: body.category,
        amount: body.amount,
        month: body.month,
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ budget: data[0] }, { status: 201 })
})
