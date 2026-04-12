import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateBudgetAmountSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateBudgetAmountSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('budgets')
        .update({ amount: validatedData.amount })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update budget:', error)
        throw new Error('Failed to update budget')
      }

      return NextResponse.json({ budget: data })
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
      .from('budgets')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete budget:', error)
      throw new Error('Failed to delete budget')
    }

    return NextResponse.json({ message: 'Budget deleted' })
  })(request, context)
}
