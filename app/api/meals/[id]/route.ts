import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateMealSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateMealSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('meals')
        .update(validatedData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update meal:', error)
        throw new Error('Failed to update meal')
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
      .from('meals')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete meal:', error)
      throw new Error('Failed to delete meal')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
