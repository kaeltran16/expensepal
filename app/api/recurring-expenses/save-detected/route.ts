import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/recurring-expenses/save-detected
 * Save detected recurring expenses to the database
 */
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  if (!body.detectedExpenses || !Array.isArray(body.detectedExpenses)) {
    return NextResponse.json(
      { error: 'detectedExpenses array is required' },
      { status: 400 }
    )
  }

  const toInsert = body.detectedExpenses.map((detected: any) => ({
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
})
