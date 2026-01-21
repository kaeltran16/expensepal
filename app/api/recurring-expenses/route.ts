import { NextResponse } from 'next/server'
import { withAuth, safeParseJSON } from '@/lib/api/middleware'
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
  const body = await safeParseJSON(request)

  if (!body.merchant || !body.amount || !body.frequency) {
    return NextResponse.json(
      { error: 'Missing required fields: merchant, amount, and frequency' },
      { status: 400 }
    )
  }

  // Handle both camelCase and snake_case field names from tests
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
      interval_days: body.intervalDays || body.interval_days || null,
      start_date: body.startDate || body.start_date,
      end_date: body.endDate || body.end_date || null,
      next_due_date: body.nextDueDate || body.next_due_date || body.due_date,
      is_active: body.isActive ?? body.is_active ?? true,
      auto_create: body.autoCreate ?? body.auto_create ?? false,
      notify_before_days: body.notifyBeforeDays ?? body.notify_before_days ?? 1,
      is_detected: body.isDetected ?? body.is_detected ?? false,
      confidence_score: body.confidenceScore || body.confidence_score || null,
      source: body.source || 'manual',
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ recurringExpense: data })
})
