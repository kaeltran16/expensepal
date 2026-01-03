/// <reference types="cypress" />

describe('Budget Management Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login()

    // Navigate to budget view
    cy.visit('/')
    cy.contains('Budget').click()
  })

  it('creates a new budget for a category', () => {
    // Click add budget button
    cy.getByTestId('add-budget-btn').click()

    // Fill out budget form
    cy.get('select[name="category"]').select('Food')
    cy.get('input[name="limit_amount"]').clear().type('1000000')

    // Submit form
    cy.get('button[type="submit"]').contains('Create Budget').click()

    // Verify success toast
    cy.checkToast('Budget created', 'success')

    // Verify budget appears in list
    cy.contains('Food').should('be.visible')
    cy.contains('1,000,000').should('be.visible')
  })

  it('shows warning when spending reaches 80% of budget', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create budget
    cy.seedBudget({
      category: 'Food',
      limit_amount: 1000000,
      month: currentMonth,
    })

    // Add expense that reaches 80% (800,000 VND)
    cy.seedExpense({
      amount: 800000,
      merchant: 'Big Food Purchase',
      category: 'Food',
      transaction_date: `${currentMonth}-15T10:00:00Z`,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify 80% warning appears
    cy.contains('80%').should('be.visible')
    cy.contains('Warning').should('be.visible')
    cy.getByTestId('budget-warning-icon').should('be.visible')
  })

  it('shows alert when budget is exceeded', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create budget
    cy.seedBudget({
      category: 'Shopping',
      limit_amount: 500000,
      month: currentMonth,
    })

    // Add expense that exceeds budget (600,000 VND)
    cy.seedExpense({
      amount: 600000,
      merchant: 'Expensive Shopping',
      category: 'Shopping',
      transaction_date: `${currentMonth}-20T10:00:00Z`,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify budget exceeded alert
    cy.contains('Over budget').should('be.visible')
    cy.contains('Shopping').should('be.visible')
    cy.getByTestId('budget-alert-icon').should('be.visible')

    // Progress bar should be red/danger color
    cy.getByTestId('budget-progress-bar')
      .should('have.class', 'bg-destructive')
  })

  it('shows no alert when spending is within budget', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create budget
    cy.seedBudget({
      category: 'Transport',
      limit_amount: 500000,
      month: currentMonth,
    })

    // Add expense within budget (250,000 VND)
    cy.seedExpense({
      amount: 250000,
      merchant: 'Taxi Ride',
      category: 'Transport',
      transaction_date: `${currentMonth}-10T10:00:00Z`,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify no warnings
    cy.contains('Warning').should('not.exist')
    cy.contains('Over budget').should('not.exist')

    // Progress bar should be green/success color
    cy.getByTestId('budget-progress-bar')
      .should('have.class', 'bg-primary')
  })

  it('updates budget limit and recalculates progress', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create budget
    cy.seedBudget({
      category: 'Entertainment',
      limit_amount: 200000,
      month: currentMonth,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click edit budget
    cy.contains('Entertainment').parents('[data-testid="budget-card"]').within(() => {
      cy.getByTestId('edit-budget-btn').click()
    })

    // Update limit to higher amount
    cy.get('input[name="limit_amount"]').clear().type('500000')
    cy.get('button[type="submit"]').contains('Update').click()

    // Verify update
    cy.checkToast('Budget updated', 'success')
    cy.contains('500,000').should('be.visible')
  })

  it('deletes budget', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create budget
    cy.seedBudget({
      category: 'Other',
      limit_amount: 300000,
      month: currentMonth,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click delete budget
    cy.contains('Other').parents('[data-testid="budget-card"]').within(() => {
      cy.getByTestId('delete-budget-btn').click()
    })

    // Confirm deletion
    cy.get('button').contains('Delete').click()

    // Verify deletion
    cy.checkToast('Budget deleted', 'success')
    cy.contains('Other').should('not.exist')
  })

  it('tracks spending across multiple categories', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Create multiple budgets
    cy.seedBudget({ category: 'Food', limit_amount: 1000000, month: currentMonth })
    cy.seedBudget({ category: 'Transport', limit_amount: 500000, month: currentMonth })
    cy.seedBudget({ category: 'Shopping', limit_amount: 750000, month: currentMonth })

    // Add expenses for each category
    cy.seedExpense({ amount: 400000, category: 'Food', merchant: 'Food 1' })
    cy.seedExpense({ amount: 200000, category: 'Transport', merchant: 'Transport 1' })
    cy.seedExpense({ amount: 500000, category: 'Shopping', merchant: 'Shopping 1' })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify each budget shows correct progress
    cy.contains('Food').parents('[data-testid="budget-card"]').within(() => {
      cy.contains('40%').should('be.visible') // 400k / 1000k
    })

    cy.contains('Transport').parents('[data-testid="budget-card"]').within(() => {
      cy.contains('40%').should('be.visible') // 200k / 500k
    })

    cy.contains('Shopping').parents('[data-testid="budget-card"]').within(() => {
      cy.contains('66%').should('be.visible') // 500k / 750k
    })
  })

  it('provides AI-powered budget recommendations', () => {
    // Seed historical spending data (3 months)
    const months = [
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7), // 2 months ago
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7), // 1 month ago
      new Date().toISOString().slice(0, 7), // Current month
    ]

    months.forEach((month, index) => {
      cy.seedExpense({
        amount: 800000 + (index * 100000),
        category: 'Food',
        merchant: `Food ${month}`,
        transaction_date: `${month}-15T10:00:00Z`,
      })
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click AI recommendations button
    cy.getByTestId('ai-recommendations-btn').click()

    // Wait for LLM response
    cy.contains('Recommended Budget', { timeout: 10000 }).should('be.visible')

    // Should show budget recommendation based on spending trend
    cy.contains('1,000,000').should('be.visible') // Average + buffer
  })

  it('sends push notification when budget is exceeded', () => {
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Mock push notification API
    cy.window().then((win) => {
      cy.stub(win.navigator.serviceWorker, 'ready').resolves({
        showNotification: cy.stub().as('showNotification'),
      })
    })

    // Create budget
    cy.seedBudget({
      category: 'Food',
      limit_amount: 500000,
      month: currentMonth,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Add expense that exceeds budget
    cy.getByTestId('add-expense-btn').click()
    cy.get('input[name="amount"]').clear().type('600000')
    cy.get('input[name="merchant"]').clear().type('Over Budget Expense')
    cy.get('select[name="category"]').select('Food')
    cy.get('button[type="submit"]').click()

    // Verify push notification was triggered
    cy.get('@showNotification').should('have.been.calledOnce')
  })

  it('displays budget predictions for next month', () => {
    // Seed 3 months of consistent spending
    const months = [
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
      new Date().toISOString().slice(0, 7),
    ]

    months.forEach((month) => {
      cy.seedExpense({
        amount: 750000,
        category: 'Food',
        merchant: `Monthly Food ${month}`,
        transaction_date: `${month}-15T10:00:00Z`,
      })
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Navigate to analytics view
    cy.contains('Analytics').click()

    // Verify budget prediction is shown
    cy.contains('Next month prediction').should('be.visible')
    cy.contains('750,000', { timeout: 5000 }).should('be.visible')
  })
})
