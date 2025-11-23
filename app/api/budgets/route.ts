import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET budgets for a specific month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', month)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budgets: data })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('budgets')
      .insert([
        {
          category: body.category,
          amount: body.amount,
          month: body.month,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget: data[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
