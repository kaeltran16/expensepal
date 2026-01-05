import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/recurring-expenses
 * Fetch all recurring expenses for the authenticated user
 */
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const isActive = searchParams.get('isActive')
  const source = searchParams.get('source') as 'manual' | 'detected' | null
  const category = searchParams.get('category')

  let query = supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true })

  // Apply filters
  if (isActive === 'true') {
    query = query.eq('is_active', true)
  } else if (isActive === 'false') {
    query = query.eq('is_active', false)
  }

  if (source) {
    query = query.eq('source', source)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) throw error

  return NextResponse.json({ recurringExpenses: data })
})

/**
 * POST /api/recurring-expenses
 * Create a new recurring expense
 */
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: user.id,
      name: body.name,
      merchant: body.merchant,
      category: body.category || 'Other',
      amount: body.amount,
      currency: body.currency || 'VND',
      frequency: body.frequency,
      interval_days: body.intervalDays || null,
      start_date: body.startDate,
      end_date: body.endDate || null,
      next_due_date: body.nextDueDate,
      is_active: body.isActive ?? true,
      auto_create: body.autoCreate ?? false,
      notify_before_days: body.notifyBeforeDays ?? 1,
      is_detected: body.isDetected ?? false,
      confidence_score: body.confidenceScore || null,
      source: body.source || 'manual',
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
})
