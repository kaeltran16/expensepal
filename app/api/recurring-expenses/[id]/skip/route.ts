import { NextRequest, NextResponse } from 'next/server'
import { withAuthParamsAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { SkipRecurringExpenseSchema } from '@/lib/api/schemas'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    SkipRecurringExpenseSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data: expense, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('skipped_dates')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Failed to fetch recurring expense:', fetchError)
        throw new Error('Failed to fetch recurring expense')
      }

      const skippedDates = expense.skipped_dates || []
      if (!skippedDates.includes(validatedData.date)) {
        skippedDates.push(validatedData.date)
      }

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update({ skipped_dates: skippedDates })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to skip recurring expense:', error)
        throw new Error('Failed to skip recurring expense')
      }

      return NextResponse.json(data)
    }
  )(request, context)
}
