import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateGoalWithMappingSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateGoalWithMappingSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const updateData: Record<string, unknown> = {}
      if (validatedData.name !== undefined) updateData.name = validatedData.name
      if (validatedData.targetAmount !== undefined) updateData.target_amount = validatedData.targetAmount
      if (validatedData.target_amount !== undefined) updateData.target_amount = validatedData.target_amount
      if (validatedData.currentAmount !== undefined) updateData.current_amount = validatedData.currentAmount
      if (validatedData.current_amount !== undefined) updateData.current_amount = validatedData.current_amount
      if (validatedData.deadline !== undefined) updateData.deadline = validatedData.deadline
      if (validatedData.icon !== undefined) updateData.icon = validatedData.icon

      const { data, error } = await supabase
        .from('savings_goals')
        .update(updateData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update goal:', error)
        throw new Error('Failed to update goal')
      }

      return NextResponse.json({ goal: data })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (_req, user, params: { id: string }) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete goal:', error)
      throw new Error('Failed to delete goal')
    }

    return NextResponse.json({ message: 'Goal deleted' })
  })(request, context)
}
