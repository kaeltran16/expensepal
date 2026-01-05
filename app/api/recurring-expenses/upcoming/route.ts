import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/recurring-expenses/upcoming
 * Get upcoming recurring expenses within X days
 */
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  const today = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  const todayStr = today.toISOString().split('T')[0]
  const futureStr = future.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .gte('next_due_date', todayStr!)
    .lte('next_due_date', futureStr!)
    .order('next_due_date', { ascending: true })

  if (error) throw error

  return NextResponse.json({ recurringExpenses: data })
})
