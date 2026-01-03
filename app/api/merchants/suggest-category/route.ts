import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withOptionalAuth } from '@/lib/api/middleware'

export const dynamic = 'force-dynamic'

// GET suggested category for a merchant
export const GET = withOptionalAuth(async (request, user) => {
  const { searchParams } = new URL(request.url)
  const merchant = searchParams.get('merchant')

  if (!merchant) {
    return NextResponse.json({ suggestion: null })
  }

  // Find the most common category for this merchant
  const { data, error } = await supabase
    .from('expenses')
    .select('category')
    .ilike('merchant', `%${merchant}%`)
    .not('category', 'is', null)
    .limit(10)

  if (error || !data || data.length === 0) {
    return NextResponse.json({ suggestion: null })
  }

  // Count category occurrences
  const categoryCounts: Record<string, number> = {}
  data.forEach((expense) => {
    const category = expense.category || 'Other'
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  // Find the most common category
  let mostCommon = ''
  let maxCount = 0
  Object.entries(categoryCounts).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = category
    }
  })

  // Only suggest if it appears at least 2 times (confident match)
  if (maxCount >= 2) {
    return NextResponse.json({
      suggestion: mostCommon,
      confidence: maxCount,
      total: data.length,
    })
  }

  return NextResponse.json({ suggestion: null })
})
