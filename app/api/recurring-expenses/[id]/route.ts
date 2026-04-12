import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { UpdateRecurringExpenseSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const supabase = createClient()
    const { id } = await context.params

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch recurring expense:', error)
      throw new Error('Failed to fetch recurring expense')
    }

    return NextResponse.json(data)
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateRecurringExpenseSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(validatedData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update recurring expense:', error)
        throw new Error('Failed to update recurring expense')
      }

      return NextResponse.json(data)
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
      .from('recurring_expenses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete recurring expense:', error)
      throw new Error('Failed to delete recurring expense')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
