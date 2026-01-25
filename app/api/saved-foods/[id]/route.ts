import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateSavedFoodSchema } from '@/lib/api/schemas'

/**
 * PUT /api/saved-foods/[id]
 * Update a saved food (toggle favorite, update use count, etc.)
 */
export const PUT = withAuth(async (request: NextRequest, user) => {
  const id = request.url.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Saved food ID is required' }, { status: 400 })
  }

  const body = await request.json()
  const supabase = createClient()

  // Build update object
  const updates: Record<string, any> = {}

  if (typeof body.is_favorite === 'boolean') {
    updates.is_favorite = body.is_favorite
  }

  if (typeof body.use_count === 'number') {
    updates.use_count = body.use_count
  }

  if (body.last_used_at) {
    updates.last_used_at = body.last_used_at
  }

  // If incrementing use (for quick add)
  if (body.increment_use) {
    // First get current use_count
    const { data: current } = await supabase
      .from('saved_foods')
      .select('use_count')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    updates.use_count = (current?.use_count || 0) + 1
    updates.last_used_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('saved_foods')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating saved food:', error)
    return NextResponse.json(
      { error: 'Failed to update saved food' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
})

/**
 * DELETE /api/saved-foods/[id]
 * Delete a saved food
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  const id = request.url.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Saved food ID is required' }, { status: 400 })
  }

  const supabase = createClient()

  const { error } = await supabase
    .from('saved_foods')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting saved food:', error)
    return NextResponse.json(
      { error: 'Failed to delete saved food' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
