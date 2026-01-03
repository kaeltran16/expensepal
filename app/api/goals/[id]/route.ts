import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import type { Database } from '@/lib/supabase/database.types'

type SavingsGoalUpdate = Partial<Database['public']['Tables']['savings_goals']['Update']>

// Helper to extract route params
async function getGoalId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

// PUT update goal
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getGoalId(context.params)
    const supabase = createClient()
    const body = await req.json()

    const updateData: SavingsGoalUpdate = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.targetAmount !== undefined) updateData.target_amount = body.targetAmount
    if (body.currentAmount !== undefined) updateData.current_amount = body.currentAmount
    if (body.deadline !== undefined) updateData.deadline = body.deadline
    if (body.icon !== undefined) updateData.icon = body.icon

    const { data, error } = await supabase
      .from('savings_goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ goal: data })
  })(request)
}

// DELETE goal
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getGoalId(context.params)
    const supabase = createClient()

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ message: 'Goal deleted' })
  })(request)
}
