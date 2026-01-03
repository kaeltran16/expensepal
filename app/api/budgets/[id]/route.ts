import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

// Helper to extract route params
async function getBudgetId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

// PUT update budget
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getBudgetId(context.params)
    const supabase = createClient()
    const body = await req.json()

    const { data, error } = await supabase
      .from('budgets')
      .update({ amount: body.amount })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ budget: data })
  })(request)
}

// DELETE budget
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const id = await getBudgetId(context.params)
    const supabase = createClient()

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ message: 'Budget deleted' })
  })(request)
}
