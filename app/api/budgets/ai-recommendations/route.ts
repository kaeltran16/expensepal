import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { generateAIBudgetRecommendations, type AIBudgetRecommendation } from '@/lib/analytics/budget-recommendations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/budgets/ai-recommendations
 *
 * Generate AI-powered budget recommendations based on historical spending data
 *
 * Query parameters:
 * - months: Number of months of historical data to analyze (default: 12)
 * - includeBasic: Whether to include basic algorithmic recommendations as fallback (default: true)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createClient()
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const monthsOfHistory = parseInt(searchParams.get('months') || '12', 10)
    const includeBasic = searchParams.get('includeBasic') !== 'false'
    const forceRefresh = searchParams.get('refresh') === 'true'

    // ========================================
    // STEP 1: Check for cached recommendations
    // ========================================
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('budget_recommendations_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('months_analyzed', monthsOfHistory)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (!cacheError && cachedData) {
        console.log('✅ Returning cached budget recommendations for user:', user.id)
        return NextResponse.json({
          recommendations: cachedData.recommendations,
          summary: {
            totalCategories: (cachedData.recommendations as any[]).length,
            aiPowered: cachedData.ai_powered_count,
            algorithmic: cachedData.algorithmic_count,
            totalSavingsOpportunity: cachedData.total_savings_opportunity,
            monthsAnalyzed: cachedData.months_analyzed,
            dataPoints: cachedData.data_points,
          },
          generatedAt: cachedData.generated_at,
          cached: true,
          expiresAt: cachedData.expires_at,
        })
      }
    }

    // ========================================
    // STEP 2: Generate new recommendations
    // ========================================
    console.log('🔄 Generating new budget recommendations for user:', user.id)

    // Fetch all expenses for the user
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      )
    }

    // Fetch existing budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)

    if (budgetsError) {
      console.error('Error fetching budgets:', budgetsError)
      return NextResponse.json(
        { error: 'Failed to fetch budgets' },
        { status: 500 }
      )
    }

    // Check if user has enough data
    if (!expenses || expenses.length < 10) {
      return NextResponse.json({
        recommendations: [],
        message: 'Not enough expense data for recommendations. Please add at least 10 expenses.',
        dataPoints: expenses?.length || 0,
      })
    }

    // Generate AI-powered recommendations
    const recommendations = await generateAIBudgetRecommendations(
      expenses,
      budgets || [],
      {
        monthsOfHistory,
        includeBasicRecommendations: includeBasic,
      }
    )

    // Calculate summary stats
    const totalSavingsOpportunity = recommendations.reduce(
      (sum, rec) => sum + (rec.savingsOpportunity || 0),
      0
    )
    const aiPoweredCount = recommendations.filter((r) => r.isAI).length
    const algorithmicCount = recommendations.filter((r) => !r.isAI).length

    const summary = {
      totalCategories: recommendations.length,
      aiPowered: aiPoweredCount,
      algorithmic: algorithmicCount,
      totalSavingsOpportunity,
      monthsAnalyzed: monthsOfHistory,
      dataPoints: expenses.length,
    }

    // ========================================
    // STEP 3: Cache the new recommendations
    // ========================================
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expire in 7 days

    // Delete old cached recommendations for this user
    await supabase
      .from('budget_recommendations_cache')
      .delete()
      .eq('user_id', user.id)

    // Insert new cache entry
    const { error: insertError } = await supabase
      .from('budget_recommendations_cache')
      .insert({
        user_id: user.id,
        recommendations: recommendations as any,
        months_analyzed: monthsOfHistory,
        data_points: expenses.length,
        total_savings_opportunity: totalSavingsOpportunity,
        ai_powered_count: aiPoweredCount,
        algorithmic_count: algorithmicCount,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Failed to cache recommendations:', insertError)
      // Continue anyway - we'll just return uncached result
    } else {
      console.log('✅ Cached budget recommendations for 7 days')
    }

    return NextResponse.json({
      recommendations,
      summary,
      generatedAt: new Date().toISOString(),
      cached: false,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error generating AI budget recommendations:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
})
