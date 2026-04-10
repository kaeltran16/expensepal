import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateSavedFoodSchema } from '@/lib/api/schemas'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateSavedFoodSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()
      const { increment_use, ...updates } = validatedData

      if (increment_use) {
        const { data: current } = await supabase
          .from('saved_foods')
          .select('use_count')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        updates.use_count = (current?.use_count || 0) + 1
        updates.last_used_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('saved_foods')
        .update(updates)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update saved food:', error)
        throw new Error('Failed to update saved food')
      }

      return NextResponse.json(data)
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('saved_foods')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete saved food:', error)
      throw new Error('Failed to delete saved food')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
