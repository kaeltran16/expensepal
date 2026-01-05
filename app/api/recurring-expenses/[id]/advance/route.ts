import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/recurring-expenses/[id]/advance
 * Advance the next due date to the next occurrence
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const supabase = createClient()
    const { id } = await context.params

  // Get current recurring expense
  const { data: expense, error: fetchError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError) throw fetchError

  const nextDueDate = new Date(expense.next_due_date)
  const today = new Date()

  let newNextDueDate: Date

  switch (expense.frequency) {
    case 'weekly':
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setDate(newNextDueDate.getDate() + 7)
      break
    case 'biweekly':
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setDate(newNextDueDate.getDate() + 14)
      break
    case 'monthly':
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setMonth(newNextDueDate.getMonth() + 1)
      break
    case 'quarterly':
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setMonth(newNextDueDate.getMonth() + 3)
      break
    case 'yearly':
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setFullYear(newNextDueDate.getFullYear() + 1)
      break
    case 'custom':
      newNextDueDate = new Date(nextDueDate)
      const days = expense.interval_days || 30
      newNextDueDate.setDate(newNextDueDate.getDate() + days)
      break
    default:
      newNextDueDate = new Date(nextDueDate)
      newNextDueDate.setMonth(newNextDueDate.getMonth() + 1)
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({
      next_due_date: newNextDueDate.toISOString().split('T')[0]!,
      last_processed_date: today.toISOString().split('T')[0]!,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
  })(request)
}
