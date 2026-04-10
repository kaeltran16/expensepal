import { NextResponse } from 'next/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { SaveDetectedExpensesSchema } from '@/lib/api/schemas'

export const POST = withAuthAndValidation(
  SaveDetectedExpensesSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const toInsert = validatedData.detectedExpenses.map((detected) => ({
      user_id: user.id,
      name: detected.merchant,
      merchant: detected.merchant,
      category: detected.category,
      amount: detected.averageAmount,
      frequency: detected.frequency,
      interval_days: detected.intervalDays,
      start_date: new Date().toISOString().split('T')[0]!,
      next_due_date: new Date(detected.nextExpected).toISOString().split('T')[0]!,
      is_detected: true,
      confidence_score: detected.confidence,
      source: 'detected' as const,
      is_active: true,
      auto_create: false,
    }))

    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(toInsert)
      .select()

    if (error) throw error

    return NextResponse.json(data)
  }
)
