import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { detectRecurringExpenses } from '@/lib/analytics/detect-recurring'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch expenses for recurring detection:', error)
    throw new Error('Failed to fetch expenses for recurring detection')
  }

  const detectedExpenses = detectRecurringExpenses(expenses || [])

  return NextResponse.json({ detectedExpenses })
})
