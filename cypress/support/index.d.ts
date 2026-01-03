/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>
    logout(): Chainable<void>
    seedExpense(expense?: Partial<{
      amount: number
      merchant: string
      category: string
      transaction_date: string
      currency: string
      source: string
    }>): Chainable<void>
    seedBudget(budget?: Partial<{
      category: string
      limit_amount: number
      month: string
    }>): Chainable<void>
    seedWorkout(workout?: Partial<{
      date: string
      template_id: string | null
      exercises_completed: any[]
    }>): Chainable<void>
    seedMeal(meal?: Partial<{
      description: string
      calories: number
      meal_time: string
      date: string
    }>): Chainable<void>
    waitForQueryToSettle(): Chainable<void>
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>
    checkToast(message: string, type?: 'success' | 'error' | 'warning'): Chainable<void>
    goOffline(): Chainable<void>
    goOnline(): Chainable<void>
  }
}
