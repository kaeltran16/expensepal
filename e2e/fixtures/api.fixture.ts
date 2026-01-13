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

type ApiFixture = {
  seedExpense: (expense: Partial<Expense>) => Promise<Expense>
  seedBudget: (budget: Partial<Budget>) => Promise<Budget>
  deleteAllExpenses: () => Promise<void>
  deleteAllBudgets: () => Promise<void>
  getExpenses: () => Promise<Expense[]>
  getBudgets: (month?: string) => Promise<Budget[]>
}

export const test = base.extend<{ api: ApiFixture }>({
  api: async ({ request }, use) => {
    const api: ApiFixture = {
      seedExpense: async (expense) => {
        const defaults: Expense = {
          amount: 50000,
          merchant: 'Test Merchant',
          category: 'Food',
          transaction_date: new Date().toISOString(),
          ...expense,
        }

        const response = await request.post('/api/expenses', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed expense: ${await response.text()}`)
        }

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

        const response = await request.post('/api/budgets', {
          data: defaults,
        })

        if (!response.ok()) {
          throw new Error(`Failed to seed budget: ${await response.text()}`)
        }

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
        const response = await request.get('/api/expenses')
        const data = await response.json()
        return data.expenses || []
      },

      getBudgets: async (month?: string) => {
        const currentMonth = month || new Date().toISOString().slice(0, 7)
        const response = await request.get(`/api/budgets?month=${currentMonth}`)
        const data = await response.json()
        return data.budgets || []
      },
    }

    await use(api)
  },
})

export { expect } from '@playwright/test'
