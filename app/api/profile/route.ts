import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateProfileSchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'

// GET /api/profile - Get current user's profile
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  // Fetch user profile - RLS automatically filters by user_id
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    // If profile doesn't exist, create one
    if (profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError} = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return NextResponse.json({ profile: newProfile })
    }

    console.error('Error fetching profile:', profileError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  return NextResponse.json({ profile })
})

// PUT /api/profile - Update current user's profile
export const PUT = withAuthAndValidation(
  UpdateProfileSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    // Update user profile - RLS automatically filters by user_id
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update(validatedData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  }
)
