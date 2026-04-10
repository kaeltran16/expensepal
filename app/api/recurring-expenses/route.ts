import { NextResponse } from 'next/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateRecurringExpenseSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'

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

export const POST = withAuthAndValidation(CreateRecurringExpenseSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: user.id,
      merchant: validatedData.merchant,
      category: validatedData.category,
      amount: validatedData.amount,
      frequency: validatedData.frequency,
      start_date: validatedData.start_date,
      end_date: validatedData.end_date || null,
      is_active: true,
      source: 'manual',
      notes: validatedData.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ recurringExpense: data })
})
