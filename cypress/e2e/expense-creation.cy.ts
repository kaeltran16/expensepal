/// <reference types="cypress" />

describe('Expense Creation Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login()

    // Navigate to expenses view
    cy.visit('/')
    cy.contains('Expenses').click()
  })

  it('creates expense with manual input and displays in list', () => {
    // Click add expense button
    cy.getByTestId('add-expense-btn').click()

    // Fill out expense form
    cy.get('input[name="amount"]').clear().type('50000')
    cy.get('input[name="merchant"]').clear().type('Starbucks Coffee')
    cy.get('select[name="category"]').select('Food')

    // Submit form
    cy.get('button[type="submit"]').contains('Add Expense').click()

    // Verify success toast
    cy.checkToast('Expense created', 'success')

    // Verify expense appears in list
    cy.contains('Starbucks Coffee').should('be.visible')
    cy.contains('50,000').should('be.visible')
    cy.contains('Food').should('be.visible')
  })

  it('shows validation error for invalid amount', () => {
    cy.getByTestId('add-expense-btn').click()

    // Try to submit with negative amount
    cy.get('input[name="amount"]').clear().type('-100')
    cy.get('input[name="merchant"]').clear().type('Test Merchant')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Amount must be positive').should('be.visible')
  })

  it('shows validation error for missing merchant', () => {
    cy.getByTestId('add-expense-btn').click()

    // Try to submit without merchant
    cy.get('input[name="amount"]').clear().type('50000')
    cy.get('button[type="submit"]').click()

    // Should show validation error
    cy.contains('Merchant is required').should('be.visible')
  })

  it('creates food expense and auto-creates meal entry', () => {
    cy.getByTestId('add-expense-btn').click()

    // Create food category expense
    cy.get('input[name="amount"]').clear().type('75000')
    cy.get('input[name="merchant"]').clear().type('Pho Restaurant')
    cy.get('select[name="category"]').select('Food')
    cy.get('button[type="submit"]').click()

    // Wait for queries to settle
    cy.waitForQueryToSettle()

    // Navigate to calories view
    cy.contains('Calories').click()

    // Verify meal was auto-created (AI estimation)
    cy.contains('Pho Restaurant').should('be.visible')
  })

  it('supports optimistic UI updates', () => {
    // Intercept API call to add delay
    cy.intercept('POST', '/api/expenses', (req) => {
      req.reply((res) => {
        res.delay = 2000 // 2 second delay
        res.send()
      })
    })

    cy.getByTestId('add-expense-btn').click()

    cy.get('input[name="amount"]').clear().type('30000')
    cy.get('input[name="merchant"]').clear().type('Grab Taxi')
    cy.get('select[name="category"]').select('Transport')
    cy.get('button[type="submit"]').click()

    // Expense should appear immediately (optimistic update)
    cy.contains('Grab Taxi', { timeout: 500 }).should('be.visible')

    // And persist after server response
    cy.wait(2500)
    cy.contains('Grab Taxi').should('be.visible')
  })

  it('allows editing expense after creation', () => {
    // Create expense first
    cy.seedExpense({
      amount: 40000,
      merchant: 'Old Merchant',
      category: 'Shopping',
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click on expense to expand
    cy.contains('Old Merchant').click()

    // Click edit button
    cy.getByTestId('edit-expense-btn').click()

    // Update merchant name
    cy.get('input[name="merchant"]').clear().type('New Merchant')
    cy.get('button[type="submit"]').contains('Update').click()

    // Verify update
    cy.checkToast('Expense updated', 'success')
    cy.contains('New Merchant').should('be.visible')
    cy.contains('Old Merchant').should('not.exist')
  })

  it('allows deleting expense', () => {
    // Create expense first
    cy.seedExpense({
      amount: 25000,
      merchant: 'To Be Deleted',
      category: 'Other',
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click on expense to expand
    cy.contains('To Be Deleted').click()

    // Click delete button
    cy.getByTestId('delete-expense-btn').click()

    // Confirm deletion
    cy.get('button').contains('Delete').click()

    // Verify deletion
    cy.checkToast('Expense deleted', 'success')
    cy.contains('To Be Deleted').should('not.exist')
  })

  it('filters expenses by category', () => {
    // Seed multiple expenses
    cy.seedExpense({ merchant: 'Food Expense', category: 'Food', amount: 50000 })
    cy.seedExpense({ merchant: 'Transport Expense', category: 'Transport', amount: 30000 })
    cy.seedExpense({ merchant: 'Shopping Expense', category: 'Shopping', amount: 100000 })

    cy.reload()
    cy.waitForQueryToSettle()

    // Open filter menu
    cy.getByTestId('filter-btn').click()

    // Select Food category
    cy.get('input[value="Food"]').check()

    // Verify only Food expenses are visible
    cy.contains('Food Expense').should('be.visible')
    cy.contains('Transport Expense').should('not.exist')
    cy.contains('Shopping Expense').should('not.exist')
  })

  it('works offline with queue mechanism', () => {
    // Go offline
    cy.goOffline()

    cy.getByTestId('add-expense-btn').click()

    cy.get('input[name="amount"]').clear().type('60000')
    cy.get('input[name="merchant"]').clear().type('Offline Expense')
    cy.get('select[name="category"]').select('Food')
    cy.get('button[type="submit"]').click()

    // Should show queued message
    cy.checkToast('Queued for sync', 'warning')

    // Expense should still appear in list (optimistic)
    cy.contains('Offline Expense').should('be.visible')

    // Go back online
    cy.goOnline()

    // Should sync and show success
    cy.checkToast('Synced successfully', 'success')
  })

  it('displays monthly spending total', () => {
    // Seed expenses for current month
    const currentMonth = new Date().toISOString().slice(0, 7)

    cy.seedExpense({ amount: 50000, merchant: 'Expense 1', transaction_date: `${currentMonth}-01T10:00:00Z` })
    cy.seedExpense({ amount: 75000, merchant: 'Expense 2', transaction_date: `${currentMonth}-02T10:00:00Z` })
    cy.seedExpense({ amount: 25000, merchant: 'Expense 3', transaction_date: `${currentMonth}-03T10:00:00Z` })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify total (150,000 VND)
    cy.contains('150,000').should('be.visible')
    cy.contains('Total this month').should('be.visible')
  })
})
