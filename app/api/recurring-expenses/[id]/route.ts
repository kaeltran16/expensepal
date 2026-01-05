import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/recurring-expenses/[id]
 * Get a single recurring expense by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const supabase = createClient()
    const { id } = await context.params

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  })(request)
}

/**
 * PATCH /api/recurring-expenses/[id]
 * Update a recurring expense
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const supabase = createClient()
    const { id } = await context.params
    const body = await req.json()

    const updates: any = {}

    if (body.name !== undefined) updates.name = body.name
    if (body.merchant !== undefined) updates.merchant = body.merchant
    if (body.category !== undefined) updates.category = body.category
    if (body.amount !== undefined) updates.amount = body.amount
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.frequency !== undefined) updates.frequency = body.frequency
    if (body.intervalDays !== undefined) updates.interval_days = body.intervalDays
    if (body.startDate !== undefined) updates.start_date = body.startDate
    if (body.endDate !== undefined) updates.end_date = body.endDate
    if (body.nextDueDate !== undefined) updates.next_due_date = body.nextDueDate
    if (body.lastProcessedDate !== undefined) updates.last_processed_date = body.lastProcessedDate
    if (body.isActive !== undefined) updates.is_active = body.isActive
    if (body.autoCreate !== undefined) updates.auto_create = body.autoCreate
    if (body.notifyBeforeDays !== undefined) updates.notify_before_days = body.notifyBeforeDays
    if (body.notes !== undefined) updates.notes = body.notes

    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  })(request)
}

/**
 * DELETE /api/recurring-expenses/[id]
 * Delete a recurring expense
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const supabase = createClient()
    const { id } = await context.params

    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  })(request)
}
