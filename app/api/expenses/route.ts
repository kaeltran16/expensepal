import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET all expenses
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const merchant = searchParams.get('merchant')
    const category = searchParams.get('category')

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }

    if (merchant) {
      query = query.ilike('merchant', `%${merchant}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expenses: data })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new expense
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user.id,
          card_number: body.cardNumber,
          cardholder: body.cardholder,
          transaction_type: body.transactionType,
          amount: body.amount,
          currency: body.currency || 'VND',
          transaction_date: body.transactionDate,
          merchant: body.merchant,
          category: body.category,
          notes: body.notes,
          source: body.source || 'manual',
          email_subject: body.emailSubject,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expense: data[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
