import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

// Helper to extract route params
async function getMealId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

// PUT /api/meals/[id] - Update meal
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getMealId(context.params)
    const supabase = createClient()
    const body = await req.json()

    // Only allow users to update their own meals
    const { data, error } = await supabase
      .from('meals')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data)
  })(request)
}

// DELETE /api/meals/[id] - Delete meal
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getMealId(context.params)
    const supabase = createClient()

    // Only allow users to delete their own meals
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  })(request)
}
