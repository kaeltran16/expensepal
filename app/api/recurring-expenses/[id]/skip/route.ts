import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/recurring-expenses/[id]/skip
 * Skip a specific date for a recurring expense
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const supabase = createClient()
    const { id } = await context.params
    const body = await req.json()

  if (!body.date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  // Get current recurring expense
  const { data: expense, error: fetchError } = await supabase
    .from('recurring_expenses')
    .select('skipped_dates')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError) throw fetchError

  // Add date to skipped_dates array if not already there
  const skippedDates = expense.skipped_dates || []
  if (!skippedDates.includes(body.date)) {
    skippedDates.push(body.date)
  }

  // Update with new skipped dates
  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ skipped_dates: skippedDates })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
  })(request)
}
