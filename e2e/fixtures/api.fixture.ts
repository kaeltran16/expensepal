import { test as base } from '@playwright/test'

type Expense = {
  id?: string
  amount: number
  merchant: string
  category: string
  transaction_date?: string
  notes?: string
}

type Budget = {
  id?: string
  category: string
  amount: number
  month?: string
}

type RecurringExpense = {
  id?: string
  merchant: string
  amount: number
  category: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  due_date: string
  notes?: string
}

type SavingsGoal = {
  id?: string
  name: string
  target_amount: number
  current_amount?: number
  deadline?: string
  notes?: string
}

type Meal = {
  id?: string
  name: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  meal_date?: string
  notes?: string
}

type CalorieGoal = {
  id?: string
  daily_calories: number
  protein_goal?: number
  carbs_goal?: number
  fat_goal?: number
}

type WorkoutTemplate = {
  id?: string
  name: string
  exercises: Array<{
    exercise_name: string
    sets: number
    reps: number
    weight?: number
  }>
  notes?: string
}

type Workout = {
  id?: string
  template_id?: string
  workout_date: string
  exercises: Array<{
    exercise_name: string
    sets: Array<{
      reps: number
      weight?: number
      completed: boolean
    }>
  }>
  duration_minutes?: number
  notes?: string
}

type EmailAccount = {
  id?: string
  email: string
  app_password?: string
  imap_host?: string
  imap_port?: number
  use_tls?: boolean
  enabled?: boolean
}

type Profile = {
  id?: string
  name?: string
  email?: string
  theme?: 'light' | 'dark' | 'system'
}

type ApiFixture = {
  // Expenses
  seedExpense: (expense: Partial<Expense>) => Promise<Expense>
  deleteAllExpenses: () => Promise<void>
  getExpenses: () => Promise<Expense[]>

  // Budgets
  seedBudget: (budget: Partial<Budget>) => Promise<Budget>
  deleteAllBudgets: () => Promise<void>
  getBudgets: (month?: string) => Promise<Budget[]>

  // Recurring Expenses
  seedRecurringExpense: (recurring: Partial<RecurringExpense>) => Promise<RecurringExpense>
  deleteAllRecurringExpenses: () => Promise<void>
  getRecurringExpenses: () => Promise<RecurringExpense[]>
  advanceRecurringExpense: (id: string) => Promise<void>
  skipRecurringExpense: (id: string) => Promise<void>

  // Savings Goals
  seedGoal: (goal: Partial<SavingsGoal>) => Promise<SavingsGoal>
  addSavingsToGoal: (goalId: string, amount: number) => Promise<void>
  deleteAllGoals: () => Promise<void>
  getGoals: () => Promise<SavingsGoal[]>

  // Meals
  seedMeal: (meal: Partial<Meal>) => Promise<Meal>
  deleteAllMeals: () => Promise<void>
  getMeals: (dateRange?: { start: string; end: string }) => Promise<Meal[]>
  setCalorieGoal: (goal: Partial<CalorieGoal>) => Promise<CalorieGoal>

  // Workouts
  seedWorkoutTemplate: (template: Partial<WorkoutTemplate>) => Promise<WorkoutTemplate>
  seedWorkout: (workout: Partial<Workout>) => Promise<Workout>
  deleteAllWorkoutTemplates: () => Promise<void>
  deleteAllWorkouts: () => Promise<void>
  getWorkoutTemplates: () => Promise<WorkoutTemplate[]>
  getWorkouts: () => Promise<Workout[]>

  // Email Settings
  seedEmailAccount: (account: Partial<EmailAccount>) => Promise<EmailAccount>
  deleteAllEmailAccounts: () => Promise<void>
  getEmailAccounts: () => Promise<EmailAccount[]>

  // Profile
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>
  getProfile: () => Promise<Profile>
}

export const test = base.extend<{ api: ApiFixture }>({
  api: async ({ page }, use) => {
    // Use page.request which shares cookies with the page automatically
    const request = page.request

    // Helper function to retry POST requests on transient failures
    const retryPost = async (url: string, body: any, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await request.post(url, { data: body })

          if (response.ok()) {
            return response
          }

          // If not OK and not last attempt, wait and retry
          if (attempt < maxRetries) {
            const errorText = await response.text()
            console.log(`Attempt ${attempt} failed for ${url}: ${response.status()} - ${errorText}. Retrying...`)
            await page.waitForTimeout(1000 * attempt)
            continue
          }

          // Last attempt failed, throw error
          throw new Error(`Failed after ${maxRetries} attempts: ${response.status()} ${await response.text()}`)
        } catch (error) {
          if (attempt < maxRetries) {
            console.log(`Network error on attempt ${attempt} for ${url}: ${error}. Retrying...`)
            await page.waitForTimeout(1000 * attempt)
            continue
          }
          throw error
        }
      }
      throw new Error(`Failed after ${maxRetries} attempts`)
    }

    const api: ApiFixture = {
      seedExpense: async (expense) => {
        const defaults: Expense = {
          amount: 50000,
          merchant: 'Test Merchant',
          category: 'Food',
          transaction_date: new Date().toISOString(),
          ...expense,
        }

        const response = await retryPost('/api/expenses', defaults)
        const data = await response.json()
        return data.expense
      },

      seedBudget: async (budget) => {
        const currentMonth = new Date().toISOString().slice(0, 7)
        const defaults: Budget = {
          category: 'Food',
          amount: 1000000,
          month: currentMonth,
          ...budget,
        }

        const response = await retryPost('/api/budgets', defaults)
        const data = await response.json()
        return data.budget
      },

      deleteAllExpenses: async () => {
        const expenses = await api.getExpenses()
        for (const expense of expenses) {
          await request.delete(`/api/expenses/${expense.id}`)
        }
      },

      deleteAllBudgets: async () => {
        const budgets = await api.getBudgets()
        for (const budget of budgets) {
          await request.delete(`/api/budgets/${budget.id}`)
        }
      },

      getExpenses: async () => {
        // Retry logic for auth propagation - increased retries for parallel test execution
        for (let i = 0; i < 5; i++) {
          const response = await request.get('/api/expenses')
          const contentType = response.headers()['content-type']

          // If we get HTML, auth cookies might not be set yet - wait and retry
          if (contentType && !contentType.includes('application/json')) {
            if (i < 4) {
              await page.waitForTimeout(2000) // Longer wait for parallel tests
              continue
            }
            const text = await response.text()
            throw new Error(`Expected JSON but got ${contentType}. Not authenticated after ${i+1} retries`)
          }

          if (!response.ok()) {
            throw new Error(`API request failed: ${response.status()} ${response.statusText()}`)
          }

          const data = await response.json()
          return data.expenses || []
        }
        throw new Error('Failed to get expenses after retries')
      },

      getBudgets: async (month?: string) => {
        const currentMonth = month || new Date().toISOString().slice(0, 7)

        // Retry logic for auth propagation
        for (let i = 0; i < 5; i++) {
          const response = await request.get(`/api/budgets?month=${currentMonth}`)
          const contentType = response.headers()['content-type']

          if (contentType && !contentType.includes('application/json')) {
            if (i < 4) {
              await page.waitForTimeout(2000)
              continue
            }
            throw new Error(`Expected JSON but got ${contentType}. Not authenticated after ${i+1} retries`)
          }

          if (!response.ok()) {
            throw new Error(`API request failed: ${response.status()} ${response.statusText()}`)
          }

          const data = await response.json()
          return data.budgets || []
        }
        throw new Error('Failed to get budgets after retries')
      },

      // Recurring Expenses
      seedRecurringExpense: async (recurring) => {
        const defaults: RecurringExpense = {
          merchant: 'Test Recurring',
          amount: 100000,
          category: 'Bills',
          frequency: 'monthly',
          due_date: new Date().toISOString().split('T')[0],
          ...recurring,
        }

        const response = await retryPost('/api/recurring-expenses', defaults)
        const data = await response.json()
        return data.recurringExpense || data
      },

      deleteAllRecurringExpenses: async () => {
        const recurring = await api.getRecurringExpenses()
        for (const item of recurring) {
          await request.delete(`/api/recurring-expenses/${item.id}`)
        }
      },

      getRecurringExpenses: async () => {
        const response = await request.get('/api/recurring-expenses')
        const data = await response.json()
        return data.recurringExpenses || data.recurring || []
      },

      advanceRecurringExpense: async (id: string) => {
        const response = await request.post(`/api/recurring-expenses/${id}/advance`, {})
        if (!response.ok()) {
          throw new Error(`Failed to advance recurring expense: ${await response.text()}`)
        }
      },

      skipRecurringExpense: async (id: string) => {
        const response = await request.post(`/api/recurring-expenses/${id}/skip`, {})
        if (!response.ok()) {
          throw new Error(`Failed to skip recurring expense: ${await response.text()}`)
        }
      },

      // Savings Goals
      seedGoal: async (goal) => {
        const defaults: SavingsGoal = {
          name: 'Test Goal',
          target_amount: 1000000,
          current_amount: 0,
          ...goal,
        }

        const response = await retryPost('/api/goals', defaults)
        const data = await response.json()
        return data.goal || data
      },

      addSavingsToGoal: async (goalId: string, amount: number) => {
        const response = await request.post(`/api/goals/${goalId}/add-savings`, {
          data: { amount },
        })

        if (!response.ok()) {
          throw new Error(`Failed to add savings to goal: ${await response.text()}`)
        }
      },

      deleteAllGoals: async () => {
        const goals = await api.getGoals()
        for (const goal of goals) {
          await request.delete(`/api/goals/${goal.id}`)
        }
      },

      getGoals: async () => {
        const response = await request.get('/api/goals')
        const data = await response.json()
        return data.goals || []
      },

      // Meals
      seedMeal: async (meal) => {
        const defaults: Meal = {
          name: 'Test Meal',
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 15,
          meal_date: new Date().toISOString(),
          ...meal,
        }

        const response = await request.post('/api/meals', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed meal: ${await response.text()}`)
        }

        const data = await response.json()
        return data.meal || data
      },

      deleteAllMeals: async () => {
        const meals = await api.getMeals()
        for (const meal of meals) {
          await request.delete(`/api/meals/${meal.id}`)
        }
      },

      getMeals: async (dateRange?: { start: string; end: string }) => {
        let url = '/api/meals'
        if (dateRange) {
          url += `?start=${dateRange.start}&end=${dateRange.end}`
        }
        const response = await request.get(url)
        const data = await response.json()
        return data.meals || []
      },

      setCalorieGoal: async (goal) => {
        const defaults: CalorieGoal = {
          daily_calories: 2000,
          protein_goal: 150,
          carbs_goal: 200,
          fat_goal: 70,
          ...goal,
        }

        const response = await request.post('/api/calorie-goal', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to set calorie goal: ${await response.text()}`)
        }

        const data = await response.json()
        return data.goal || data
      },

      // Workouts
      seedWorkoutTemplate: async (template) => {
        const defaults: WorkoutTemplate = {
          name: 'Test Template',
          exercises: [
            {
              exercise_name: 'Bench Press',
              sets: 3,
              reps: 10,
              weight: 60,
            },
          ],
          ...template,
        }

        const response = await request.post('/api/workouts/templates', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed workout template: ${await response.text()}`)
        }

        const data = await response.json()
        return data.template || data
      },

      seedWorkout: async (workout) => {
        const defaults: Workout = {
          workout_date: new Date().toISOString(),
          exercises: [
            {
              exercise_name: 'Bench Press',
              sets: [
                { reps: 10, weight: 60, completed: true },
                { reps: 10, weight: 60, completed: true },
                { reps: 10, weight: 60, completed: true },
              ],
            },
          ],
          ...workout,
        }

        const response = await request.post('/api/workouts', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed workout: ${await response.text()}`)
        }

        const data = await response.json()
        return data.workout || data
      },

      deleteAllWorkoutTemplates: async () => {
        const templates = await api.getWorkoutTemplates()
        for (const template of templates) {
          await request.delete(`/api/workouts/templates/${template.id}`)
        }
      },

      deleteAllWorkouts: async () => {
        const workouts = await api.getWorkouts()
        for (const workout of workouts) {
          await request.delete(`/api/workouts/${workout.id}`)
        }
      },

      getWorkoutTemplates: async () => {
        const response = await request.get('/api/workouts/templates')
        const data = await response.json()
        return data.templates || []
      },

      getWorkouts: async () => {
        const response = await request.get('/api/workouts')
        const data = await response.json()
        return data.workouts || []
      },

      // Email Settings
      seedEmailAccount: async (account) => {
        const defaults: EmailAccount = {
          email: 'test@gmail.com',
          app_password: 'test_password',
          imap_host: 'imap.gmail.com',
          imap_port: 993,
          use_tls: true,
          enabled: true,
          ...account,
        }

        const response = await request.post('/api/settings/email', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed email account: ${await response.text()}`)
        }

        const data = await response.json()
        return data.account || data
      },

      deleteAllEmailAccounts: async () => {
        const accounts = await api.getEmailAccounts()
        for (const account of accounts) {
          await request.delete(`/api/settings/email/${account.id}`)
        }
      },

      getEmailAccounts: async () => {
        const response = await request.get('/api/settings/email')
        const data = await response.json()
        return data.accounts || []
      },

      // Profile
      updateProfile: async (updates) => {
        const response = await request.patch('/api/profile', {
          data: updates,
        })

        if (!response.ok()) {
          throw new Error(`Failed to update profile: ${await response.text()}`)
        }

        const data = await response.json()
        return data.profile || data
      },

      getProfile: async () => {
        const response = await request.get('/api/profile')
        const data = await response.json()
        return data.profile || data
      },
    }

    await use(api)
  },
})

export { expect } from '@playwright/test'
