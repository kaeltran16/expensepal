'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { X } from 'lucide-react'
import type { Expense } from '@/lib/supabase'

interface AnalyticsChartsProps {
  expenses: Expense[]
  onCategoryFilter?: (category: string | null) => void
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']

export function AnalyticsCharts({ expenses, onCategoryFilter }: AnalyticsChartsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Category breakdown data
  const categoryData = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other'
    const existing = acc.find((item) => item.name === category)
    if (existing) {
      existing.value += expense.amount
    } else {
      acc.push({ name: category, value: expense.amount })
    }
    return acc
  }, [] as { name: string; value: number }[])

  const handleCategoryClick = (category: string) => {
    hapticFeedback('light')
    const newCategory = selectedCategory === category ? null : category
    setSelectedCategory(newCategory)
    if (onCategoryFilter) {
      onCategoryFilter(newCategory)
    }
  }

  const handleClearFilter = () => {
    hapticFeedback('light')
    setSelectedCategory(null)
    if (onCategoryFilter) {
      onCategoryFilter(null)
    }
  }

  // Daily spending trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const dailyData = last7Days.map((date) => {
    const dayExpenses = expenses.filter((e) => {
      const expenseDate = new Date(e.transaction_date).toISOString().split('T')[0]
      return expenseDate === date
    })
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      amount: total,
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value, 'VND')}
          </p>
        </div>
      )
    }
    return null
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No expense data to display analytics
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Breakdown */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Spending by Category</h3>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              {selectedCategory}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={handleClearFilter}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
          {selectedCategory ? `Filtered by ${selectedCategory}` : 'Tap a category to filter'}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => handleCategoryClick(data.name)}
              style={{ cursor: 'pointer' }}
            >
              {categoryData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={selectedCategory === null || selectedCategory === entry.name ? 1 : 0.3}
                  className="transition-opacity duration-200"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Category Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {categoryData.map((item, index) => (
            <button
              key={item.name}
              onClick={() => handleCategoryClick(item.name)}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all active:scale-95 ${
                selectedCategory === item.name
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs sm:text-sm font-medium truncate">{item.name}</span>
              <span className="text-xs sm:text-sm text-muted-foreground ml-auto">
                {formatCurrency(item.value, 'VND')}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Daily Trend */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Last 7 Days Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{payload[0].payload.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(payload[0].value as number, 'VND')}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
