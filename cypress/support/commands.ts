/// <reference types="cypress" />

// Custom command to log in via dev login form
// Uses the development-only email/password form
Cypress.Commands.add('login', () => {
  cy.session('auth-session', () => {
    cy.visit('/login')

    // Fill out the dev login form
    cy.getByTestId('dev-email-input').clear().type(Cypress.env('TEST_USER_EMAIL'))
    cy.getByTestId('dev-password-input').clear().type(Cypress.env('TEST_USER_PASSWORD'))
    cy.getByTestId('dev-login-btn').click()

    // Wait for redirect to home
    cy.url({ timeout: 10000 }).should('not.include', '/login')
  }, {
    cacheAcrossSpecs: true,
    validate() {
      // Validate the session is still active
      cy.visit('/')
      cy.url().should('not.include', '/login')
    }
  })

  // After session is restored, visit home page
  cy.visit('/')
})

// Custom command to log out
Cypress.Commands.add('logout', () => {
  cy.visit('/settings')
  cy.contains('Sign Out').click()
  cy.url().should('include', '/login')
})

// Custom command to seed test data
Cypress.Commands.add('seedExpense', (expense) => {
  const defaultExpense = {
    amount: 50000,
    merchant: 'Test Merchant',
    category: 'Food',
    transaction_date: new Date().toISOString(),
    currency: 'VND',
    source: 'manual',
    ...expense,
  }

  cy.request({
    method: 'POST',
    url: '/api/expenses',
    body: defaultExpense,
    failOnStatusCode: false,
  }).then((response) => {
    expect(response.status).to.eq(200)
  })
})

// Custom command to seed budget
Cypress.Commands.add('seedBudget', (budget) => {
  const defaultBudget = {
    category: 'Food',
    limit_amount: 1000000,
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    ...budget,
  }

  cy.request({
    method: 'POST',
    url: '/api/budgets',
    body: defaultBudget,
    failOnStatusCode: false,
  })
})

// Custom command to seed workout
Cypress.Commands.add('seedWorkout', (workout) => {
  const defaultWorkout = {
    date: new Date().toISOString(),
    template_id: null,
    exercises_completed: [],
    ...workout,
  }

  cy.request({
    method: 'POST',
    url: '/api/workouts',
    body: defaultWorkout,
    failOnStatusCode: false,
  })
})

// Custom command to seed meal
Cypress.Commands.add('seedMeal', (meal) => {
  const defaultMeal = {
    description: 'Test Meal',
    calories: 500,
    meal_time: 'lunch',
    date: new Date().toISOString().split('T')[0],
    ...meal,
  }

  cy.request({
    method: 'POST',
    url: '/api/meals',
    body: defaultMeal,
    failOnStatusCode: false,
  })
})

// Custom command to wait for React Query to settle
Cypress.Commands.add('waitForQueryToSettle', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const checkQueries = () => {
        const queryClient = (win as any).queryClient
        if (!queryClient) {
          setTimeout(checkQueries, 100)
          return
        }

        const isFetching = queryClient.isFetching()
        if (isFetching === 0) {
          resolve()
        } else {
          setTimeout(checkQueries, 100)
        }
      }
      checkQueries()
    })
  })
})

// Custom command to get data-testid
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`)
})

// Custom command to check toast notification
Cypress.Commands.add('checkToast', (message: string, type?: 'success' | 'error' | 'warning') => {
  if (type) {
    cy.get(`[data-sonner-toast][data-type="${type}"]`).should('contain', message)
  } else {
    cy.get('[data-sonner-toast]').should('contain', message)
  }
})

// Custom command to simulate offline mode
Cypress.Commands.add('goOffline', () => {
  cy.log('**Going offline**')
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(false)
    win.dispatchEvent(new Event('offline'))
  })
})

// Custom command to simulate online mode
Cypress.Commands.add('goOnline', () => {
  cy.log('**Going online**')
  cy.window().then((win) => {
    cy.stub(win.navigator, 'onLine').value(true)
    win.dispatchEvent(new Event('online'))
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log in via Supabase (Google OAuth session hijacking)
       * @example cy.login()
       */
      login(): Chainable<void>

      /**
       * Custom command to log out
       * @example cy.logout()
       */
      logout(): Chainable<void>

      /**
       * Custom command to seed expense data via API
       * @example cy.seedExpense({ amount: 50000, merchant: 'Starbucks' })
       */
      seedExpense(expense?: Partial<{
        amount: number
        merchant: string
        category: string
        transaction_date: string
        currency: string
        source: string
      }>): Chainable<void>

      /**
       * Custom command to seed budget data via API
       * @example cy.seedBudget({ category: 'Food', limit_amount: 1000000 })
       */
      seedBudget(budget?: Partial<{
        category: string
        limit_amount: number
        month: string
      }>): Chainable<void>

      /**
       * Custom command to seed workout data via API
       * @example cy.seedWorkout({ date: '2024-01-01' })
       */
      seedWorkout(workout?: Partial<{
        date: string
        template_id: string | null
        exercises_completed: any[]
      }>): Chainable<void>

      /**
       * Custom command to seed meal data via API
       * @example cy.seedMeal({ description: 'Chicken Rice', calories: 600 })
       */
      seedMeal(meal?: Partial<{
        description: string
        calories: number
        meal_time: string
        date: string
      }>): Chainable<void>

      /**
       * Custom command to wait for React Query to settle
       * @example cy.waitForQueryToSettle()
       */
      waitForQueryToSettle(): Chainable<void>

      /**
       * Custom command to get element by data-testid
       * @example cy.getByTestId('add-expense-btn')
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to check toast notification
       * @example cy.checkToast('Expense created!', 'success')
       */
      checkToast(message: string, type?: 'success' | 'error' | 'warning'): Chainable<void>

      /**
       * Custom command to simulate offline mode
       * @example cy.goOffline()
       */
      goOffline(): Chainable<void>

      /**
       * Custom command to simulate online mode
       * @example cy.goOnline()
       */
      goOnline(): Chainable<void>
    }
  }
}

export {}
