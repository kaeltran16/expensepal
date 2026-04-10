import { withAuthParamsAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateCardioPlanSchema } from '@/lib/api/schemas'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateCardioPlanSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('cardio_plans')
        .update(validatedData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update cardio plan:', error)
        throw new Error('Failed to update cardio plan')
      }

      return NextResponse.json({ plan: data })
    }
  )(request, context)
}
