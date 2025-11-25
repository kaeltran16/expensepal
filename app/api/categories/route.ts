import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET all categories (default + custom)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch custom categories for user
    const { data: customCategories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Default categories
    const defaultCategories = [
      { name: 'Food', icon: '🍔', color: '#FF6B35', is_default: true },
      { name: 'Transport', icon: '🚗', color: '#4ECDC4', is_default: true },
      { name: 'Shopping', icon: '🛍️', color: '#95E1D3', is_default: true },
      { name: 'Entertainment', icon: '🎬', color: '#F38181', is_default: true },
      { name: 'Bills', icon: '💡', color: '#FFC93C', is_default: true },
      { name: 'Health', icon: '🏥', color: '#AA96DA', is_default: true },
      { name: 'Other', icon: '📦', color: '#95A3B3', is_default: true },
    ]

    // Combine default and custom categories
    const allCategories = [
      ...defaultCategories,
      ...(customCategories || []).map((c) => ({
        ...c,
        is_default: false,
      })),
    ]

    return NextResponse.json({ categories: allCategories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new custom category
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon, color } = body

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check if category name already exists (case-insensitive)
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('name')
      .eq('user_id', user.id)
      .ilike('name', name.trim())

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    // Default categories that cannot be duplicated
    const defaultCategoryNames = [
      'food',
      'transport',
      'shopping',
      'entertainment',
      'bills',
      'health',
      'other',
    ]
    if (defaultCategoryNames.includes(name.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'This is a default category name' },
        { status: 400 }
      )
    }

    // Create new category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          icon: icon || '📁',
          color: color || '#95A3B3',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
