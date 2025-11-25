import type { Budget, Expense } from '../supabase'

export interface BudgetPrediction {
  category: string
  currentSpent: number
  budget: number
  predictedSpent: number
  predictedOverage: number
  percentageUsed: number
  daysRemaining: number
  dailyAverage: number
  recommendedDailyLimit: number
  status: 'safe' | 'warning' | 'danger' | 'exceeded'
  message: string
}

export interface BudgetAlert {
  id: string
  category: string
  type: 'prediction' | 'threshold' | 'exceeded' | 'recommendation'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  action?: {
    label: string
    value: number
  }
}

/**
 * Calculate budget predictions for the current month
 * Uses linear regression based on spending patterns
 */
export function calculateBudgetPredictions(
  expenses: Expense[],
  budgets: Budget[],
  currentMonth: string = new Date().toISOString().slice(0, 7)
): BudgetPrediction[] {
  const predictions: BudgetPrediction[] = []

  // Get month boundaries
  const monthStart = new Date(`${currentMonth}-01`)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  monthEnd.setDate(0) // Last day of month

  const today = new Date()
  const daysInMonth = monthEnd.getDate()
  const daysPassed = today.getDate()
  const daysRemaining = daysInMonth - daysPassed

  // Filter expenses for current month
  const monthExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.transaction_date)
    return expenseDate >= monthStart && expenseDate < monthEnd
  })

  // Process each budget
  for (const budget of budgets) {
    // Calculate current spending
    const categoryExpenses = monthExpenses.filter(
      (e) => e.category === budget.category
    )
    const currentSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Calculate daily average
    const dailyAverage = daysPassed > 0 ? currentSpent / daysPassed : 0

    // Predict end-of-month spending (linear projection)
    const predictedSpent = dailyAverage * daysInMonth

    // Calculate predicted overage
    const predictedOverage = Math.max(0, predictedSpent - budget.amount)

    // Calculate percentage used
    const percentageUsed = budget.amount > 0 ? (currentSpent / budget.amount) * 100 : 0

    // Calculate recommended daily limit to stay within budget
    const remainingBudget = budget.amount - currentSpent
    const recommendedDailyLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

    // Determine status
    let status: BudgetPrediction['status'] = 'safe'
    if (currentSpent >= budget.amount) {
      status = 'exceeded'
    } else if (predictedSpent >= budget.amount) {
      status = 'danger'
    } else if (percentageUsed >= 80) {
      status = 'warning'
    }

    // Generate message
    let message = ''
    if (status === 'exceeded') {
      const overageAmount = currentSpent - budget.amount
      message = `Exceeded by ₫${(overageAmount / 1000).toFixed(0)}k`
    } else if (status === 'danger') {
      message = `On track to exceed by ₫${(predictedOverage / 1000).toFixed(0)}k`
    } else if (status === 'warning') {
      message = `${percentageUsed.toFixed(0)}% used - Stay under ₫${(recommendedDailyLimit / 1000).toFixed(0)}k/day`
    } else {
      const remaining = budget.amount - currentSpent
      message = `₫${(remaining / 1000).toFixed(0)}k remaining`
    }

    predictions.push({
      category: budget.category,
      currentSpent,
      budget: budget.amount,
      predictedSpent,
      predictedOverage,
      percentageUsed,
      daysRemaining,
      dailyAverage,
      recommendedDailyLimit,
      status,
      message,
    })
  }

  return predictions.sort((a, b) => {
    // Sort by severity: exceeded > danger > warning > safe
    const statusOrder = { exceeded: 0, danger: 1, warning: 2, safe: 3 }
    return statusOrder[a.status] - statusOrder[b.status]
  })
}

/**
 * Generate smart budget alerts based on predictions and spending patterns
 */
export function generateBudgetAlerts(
  expenses: Expense[],
  budgets: Budget[],
  predictions: BudgetPrediction[]
): BudgetAlert[] {
  const alerts: BudgetAlert[] = []

  // Alert for predicted overages
  predictions.forEach((pred) => {
    if (pred.status === 'danger' && pred.predictedOverage > 0) {
      alerts.push({
        id: `prediction-${pred.category}`,
        category: pred.category,
        type: 'prediction',
        severity: 'warning',
        title: `${pred.category} budget at risk`,
        message: `At your current pace, you'll exceed your budget by ₫${(pred.predictedOverage / 1000).toFixed(0)}k. Stay under ₫${(pred.recommendedDailyLimit / 1000).toFixed(0)}k/day.`,
        action: {
          label: 'Reduce budget',
          value: pred.predictedSpent,
        },
      })
    }

    if (pred.status === 'exceeded') {
      alerts.push({
        id: `exceeded-${pred.category}`,
        category: pred.category,
        type: 'exceeded',
        severity: 'critical',
        title: `${pred.category} budget exceeded`,
        message: `You've spent ₫${(pred.currentSpent / 1000).toFixed(0)}k of your ₫${(pred.budget / 1000).toFixed(0)}k budget.`,
        action: {
          label: 'Increase budget',
          value: pred.currentSpent * 1.2, // Suggest 20% more
        },
      })
    }
  })

  // Alert for spending spikes (compared to last month)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const lastMonthStr = lastMonth.toISOString().slice(0, 7)

  const categoriesWithBudgets = budgets.map((b) => b.category)

  categoriesWithBudgets.forEach((category) => {
    const currentMonthSpent = expenses
      .filter((e) => {
        const month = new Date(e.transaction_date).toISOString().slice(0, 7)
        return month === currentMonth && e.category === category
      })
      .reduce((sum, e) => sum + e.amount, 0)

    const lastMonthSpent = expenses
      .filter((e) => {
        const month = new Date(e.transaction_date).toISOString().slice(0, 7)
        return month === lastMonthStr && e.category === category
      })
      .reduce((sum, e) => sum + e.amount, 0)

    // Alert if spending is >40% higher than last month
    if (lastMonthSpent > 0 && currentMonthSpent > lastMonthSpent * 1.4) {
      const increase = ((currentMonthSpent - lastMonthSpent) / lastMonthSpent) * 100
      alerts.push({
        id: `spike-${category}`,
        category,
        type: 'threshold',
        severity: 'warning',
        title: `${category} spending spike`,
        message: `You're spending ${increase.toFixed(0)}% more on ${category} than last month (₫${((currentMonthSpent - lastMonthSpent) / 1000).toFixed(0)}k increase).`,
      })
    }
  })

  // Smart recommendations for categories without budgets
  const categoriesWithoutBudgets = [...new Set(expenses.map((e) => e.category))].filter(
    (cat) => cat && !categoriesWithBudgets.includes(cat)
  )

  categoriesWithoutBudgets.forEach((category) => {
    const categorySpent = expenses
      .filter((e) => {
        const month = new Date(e.transaction_date).toISOString().slice(0, 7)
        return month === currentMonth && e.category === category
      })
      .reduce((sum, e) => sum + e.amount, 0)

    if (categorySpent > 500000) {
      // Only suggest for significant spending (>500k VND)
      alerts.push({
        id: `recommendation-${category}`,
        category: category || 'Other',
        type: 'recommendation',
        severity: 'info',
        title: `Set a ${category} budget`,
        message: `You've spent ₫${(categorySpent / 1000).toFixed(0)}k on ${category} this month. Set a budget to track your spending.`,
        action: {
          label: 'Set budget',
          value: categorySpent * 1.2, // Suggest 20% more than current
        },
      })
    }
  })

  return alerts
}

/**
 * Calculate savings opportunities based on spending patterns
 */
export function calculateSavingsOpportunities(
  expenses: Expense[],
  budgets: Budget[]
): Array<{
  category: string
  currentAverage: number
  potentialSavings: number
  recommendation: string
}> {
  const opportunities: Array<{
    category: string
    currentAverage: number
    potentialSavings: number
    recommendation: string
  }> = []

  // Get last 3 months of data
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const recentExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= threeMonthsAgo
  )

  // Analyze each category with a budget
  budgets.forEach((budget) => {
    const categoryExpenses = recentExpenses.filter(
      (e) => e.category === budget.category
    )

    if (categoryExpenses.length === 0) return

    // Calculate average monthly spending
    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
    const monthsCount = 3
    const averageMonthly = totalSpent / monthsCount

    // If consistently under budget, suggest reduction
    if (averageMonthly < budget.amount * 0.7) {
      const potentialSavings = (budget.amount - averageMonthly) * 12 // Annual savings
      opportunities.push({
        category: budget.category,
        currentAverage: averageMonthly,
        potentialSavings,
        recommendation: `You typically spend ₫${(averageMonthly / 1000).toFixed(0)}k/month on ${budget.category}. Consider reducing your budget to ₫${(averageMonthly * 1.1 / 1000).toFixed(0)}k and save ₫${(potentialSavings / 1000).toFixed(0)}k/year.`,
      })
    }
  })

  return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings)
}
