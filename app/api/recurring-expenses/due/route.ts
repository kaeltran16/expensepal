import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recurring-expenses/due
 * Get all due or overdue recurring expenses
 */
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .lte('next_due_date', today!)
    .order('next_due_date', { ascending: true })

  if (error) throw error

  return NextResponse.json({ recurringExpenses: data })
})
