import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET all savings goals
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ goals: data })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error} = await supabase
      .from('savings_goals')
      .insert([
        {
          name: body.name,
          target_amount: body.targetAmount,
          current_amount: body.currentAmount || 0,
          deadline: body.deadline,
          icon: body.icon || '🎯',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ goal: data[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
