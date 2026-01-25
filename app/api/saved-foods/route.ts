import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateSavedFoodSchema } from '@/lib/api/schemas'

/**
 * GET /api/saved-foods
 * Get saved foods, optionally filtered by favorites
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const favoritesOnly = searchParams.get('favorites') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  const supabase = createClient()

  let query = supabase
    .from('saved_foods')
    .select('*')
    .eq('user_id', user.id)
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (favoritesOnly) {
    query = query.eq('is_favorite', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching saved foods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved foods' },
      { status: 500 }
    )
  }

  return NextResponse.json({ savedFoods: data })
})

/**
 * POST /api/saved-foods
 * Save a new food item
 */
export const POST = withAuthAndValidation(
  CreateSavedFoodSchema,
  async (request, user, data) => {
    const supabase = createClient()

    // Upsert by name (update if exists, insert if not)
    const { data: savedFood, error } = await supabase
      .from('saved_foods')
      .upsert(
        {
          user_id: user.id,
          name: data.name,
          calories: data.calories,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          is_favorite: data.is_favorite || false,
          portion_description: data.portion_description || null,
          notes: data.notes || null,
          source: 'manual',
          use_count: 1,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,name',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving food:', error)
      return NextResponse.json(
        { error: 'Failed to save food' },
        { status: 500 }
      )
    }

    return NextResponse.json(savedFood)
  }
)
