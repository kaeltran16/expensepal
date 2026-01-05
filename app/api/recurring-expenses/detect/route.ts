import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { detectRecurringExpenses } from '@/lib/analytics/detect-recurring'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recurring-expenses/detect
 * Detect recurring patterns from transaction history
 */
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  // Fetch user's expenses
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  // Run detection algorithm
  const detectedExpenses = detectRecurringExpenses(expenses || [])

  return NextResponse.json({ detectedExpenses })
})
