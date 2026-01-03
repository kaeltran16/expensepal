'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { type CalorieStats } from '@/lib/hooks'

interface NutritionChartsProps {
  stats: CalorieStats
}

const MEAL_TIME_COLORS = {
  breakfast: 'hsl(25 95% 53%)', // orange
  lunch: 'hsl(48 96% 53%)', // yellow
  dinner: 'hsl(239 84% 67%)', // indigo
  snack: 'hsl(142 76% 36%)', // green
  other: 'hsl(215 16% 47%)', // gray
}

const mealTimeConfig = {
  breakfast: {
    label: 'Breakfast',
    color: MEAL_TIME_COLORS.breakfast,
  },
  lunch: {
    label: 'Lunch',
    color: MEAL_TIME_COLORS.lunch,
  },
  dinner: {
    label: 'Dinner',
    color: MEAL_TIME_COLORS.dinner,
  },
  snack: {
    label: 'Snack',
    color: MEAL_TIME_COLORS.snack,
  },
  other: {
    label: 'Other',
    color: MEAL_TIME_COLORS.other,
  },
} satisfies ChartConfig

const calorieConfig = {
  calories: {
    label: 'Calories',
    color: 'hsl(25 95% 53%)',
  },
} satisfies ChartConfig

const macroConfig = {
  protein: {
    label: 'Protein',
    color: 'hsl(221 83% 53%)',
  },
  carbs: {
    label: 'Carbs',
    color: 'hsl(48 96% 53%)',
  },
  fat: {
    label: 'Fat',
    color: 'hsl(142 76% 36%)',
  },
} satisfies ChartConfig

export function NutritionCharts({ stats }: NutritionChartsProps) {
  // Prepare pie chart data (calories by meal time)
  const mealTimeData = Object.entries(stats.byMealTime)
    .filter(([_, data]) => data.calories > 0)
    .map(([name, data]) => ({
      mealTime: name,
      calories: data.calories,
      count: data.count,
      fill: MEAL_TIME_COLORS[name as keyof typeof MEAL_TIME_COLORS],
    }))

  // Prepare line chart data (daily calories over time)
  const dailyData = Object.entries(stats.byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // Last 14 days (increased from 7)
    .map(([date, data]) => {
      // Parse date string YYYY-MM-DD directly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number)
      const dateObj = new Date(year!, month! - 1, day!)
      
      return {
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        calories: data.calories,
        protein: Math.round(data.protein),
        carbs: Math.round(data.carbs),
        fat: Math.round(data.fat),
        average: stats.averageCaloriesPerDay,
      }
    })

  return (
    <div className="space-y-4">
      {/* Calories by meal time (Pie Chart) */}
      {mealTimeData.length > 0 && (
        <Card className="frosted-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calories by Meal Time</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={mealTimeConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="mealTime"
                      formatter={(value) => `${value.toLocaleString()} cal`}
                    />
                  }
                />
                <Pie
                  data={mealTimeData}
                  dataKey="calories"
                  nameKey="mealTime"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={false}
                >
                  {mealTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {mealTimeData.map((entry) => (
                <div key={entry.mealTime} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {mealTimeConfig[entry.mealTime as keyof typeof mealTimeConfig]?.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily calories trend (Line Chart) */}
      {dailyData.length > 0 && (
        <Card className="frosted-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">14-Day Calorie Trend</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 -mx-2">
            <ChartContainer config={calorieConfig} className="h-[200px] w-full">
              <LineChart data={dailyData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="fullDate"
                      formatter={(value, name) => {
                        if (name === 'average') return [`${value} cal`, 'Avg']
                        return [`${value.toLocaleString()} cal`, 'Calories']
                      }}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="var(--color-calories)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-calories)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {/* Average Line */}
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Macros trend (Line Chart) */}
      {dailyData.length > 0 && (
        <Card className="frosted-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Macronutrient Trends</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 -mx-2">
            <ChartContainer config={macroConfig} className="h-[200px] w-full">
              <LineChart data={dailyData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}g`}
                  width={35}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="fullDate"
                      formatter={(value) => `${value}g`}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="protein"
                  stroke="var(--color-protein)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-protein)", r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="carbs"
                  stroke="var(--color-carbs)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-carbs)", r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="fat"
                  stroke="var(--color-fat)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-fat)", r: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
