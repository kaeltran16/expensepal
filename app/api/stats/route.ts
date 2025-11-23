import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get total expenses
    let totalQuery = supabase
      .from('expenses')
      .select('amount', { count: 'exact' })
      .eq('user_id', user.id)

    if (startDate) {
      totalQuery = totalQuery.gte('transaction_date', startDate)
    }
    if (endDate) {
      totalQuery = totalQuery.lte('transaction_date', endDate)
    }

    const { data: expenses, error: totalError, count } = await totalQuery

    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 500 })
    }

    const total = expenses?.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0) || 0

    // Get expenses by category
    let categoryQuery = supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', user.id)

    if (startDate) {
      categoryQuery = categoryQuery.gte('transaction_date', startDate)
    }
    if (endDate) {
      categoryQuery = categoryQuery.lte('transaction_date', endDate)
    }

    const { data: categoryData, error: categoryError } = await categoryQuery

    if (categoryError) {
      return NextResponse.json({ error: categoryError.message }, { status: 500 })
    }

    // Aggregate by category
    const byCategory = categoryData?.reduce((acc: any, expense) => {
      const cat = expense.category || 'Uncategorized'
      if (!acc[cat]) {
        acc[cat] = 0
      }
      acc[cat] += parseFloat(String(expense.amount))
      return acc
    }, {})

    // Get top merchants
    let merchantQuery = supabase
      .from('expenses')
      .select('merchant, amount')
      .eq('user_id', user.id)

    if (startDate) {
      merchantQuery = merchantQuery.gte('transaction_date', startDate)
    }
    if (endDate) {
      merchantQuery = merchantQuery.lte('transaction_date', endDate)
    }

    const { data: merchantData, error: merchantError } = await merchantQuery

    if (merchantError) {
      return NextResponse.json({ error: merchantError.message }, { status: 500 })
    }

    // Aggregate by merchant
    const byMerchant = merchantData?.reduce((acc: any, expense) => {
      const merchant = expense.merchant
      if (!acc[merchant]) {
        acc[merchant] = 0
      }
      acc[merchant] += parseFloat(String(expense.amount))
      return acc
    }, {})

    // Sort and get top 5
    const topMerchants = Object.entries(byMerchant || {})
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([merchant, amount]) => ({ merchant, amount }))

    return NextResponse.json({
      total,
      count,
      byCategory,
      topMerchants,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
