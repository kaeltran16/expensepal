import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCategorySchema } from '@/lib/api/schemas'

export const runtime = 'edge'

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#FF6B35', is_default: true },
  { name: 'Transport', icon: '🚗', color: '#4ECDC4', is_default: true },
  { name: 'Shopping', icon: '🛍️', color: '#95E1D3', is_default: true },
  { name: 'Entertainment', icon: '🎬', color: '#F38181', is_default: true },
  { name: 'Bills', icon: '💡', color: '#FFC93C', is_default: true },
  { name: 'Health', icon: '🏥', color: '#AA96DA', is_default: true },
  { name: 'Other', icon: '📦', color: '#95A3B3', is_default: true },
]

const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORIES.map(c => c.name.toLowerCase())

export const GET = withAuth(async (_request: NextRequest, user) => {
  const supabase = createClient()

  const { data: customCategories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch categories:', error)
    throw new Error('Failed to fetch categories')
  }

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...(customCategories || []).map((c) => ({
      ...c,
      is_default: false,
    })),
  ]

  return NextResponse.json({ categories: allCategories })
})

export const POST = withAuthAndValidation(
  CreateCategorySchema,
  async (_request: NextRequest, user, validatedData) => {
    const supabase = createClient()
    const { name, icon, color } = validatedData

    const { data: existing, error: checkError } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', user.id)
      .ilike('name', name.trim())

    if (checkError) {
      console.error('Failed to check existing categories:', checkError)
      throw new Error('Failed to check existing categories')
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    if (DEFAULT_CATEGORY_NAMES.includes(name.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'This is a default category name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        icon: icon || '📁',
        color: color || '#95A3B3',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create category:', error)
      throw new Error('Failed to create category')
    }

    return NextResponse.json({ category: data }, { status: 201 })
  }
)
