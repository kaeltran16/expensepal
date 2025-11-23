import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT update goal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.targetAmount !== undefined) updateData.target_amount = body.targetAmount
    if (body.currentAmount !== undefined) updateData.current_amount = body.currentAmount
    if (body.deadline !== undefined) updateData.deadline = body.deadline
    if (body.icon !== undefined) updateData.icon = body.icon

    const { data, error } = await supabase
      .from('savings_goals')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ goal: data[0] })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Goal deleted' })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
