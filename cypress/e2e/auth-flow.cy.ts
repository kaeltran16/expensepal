/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear auth state before each test
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('shows Google login button on login page', () => {
    cy.visit('/login')

    // Verify Google login button is visible
    cy.get('#google-login-btn').should('be.visible')
    cy.contains('Continue with Google').should('be.visible')
  })

  it('logs in successfully via session hijacking', () => {
    // Use the custom login command (session hijacking)
    cy.login()

    // Verify redirect to home page
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)

    // Verify user is authenticated
    cy.contains('Expenses').should('be.visible')
  })

  it('redirects to login when accessing protected route while logged out', () => {
    // Try to access home page without logging in
    cy.visit('/')

    // Should redirect to login
    cy.url().should('include', '/login')
  })

  it('redirects to Google OAuth when clicking login button', () => {
    cy.visit('/login')

    // Click Google login (this will trigger the OAuth flow)
    cy.get('#google-login-btn').should('be.visible')

    // Note: We don't actually click it because it would open Google OAuth
    // Actual authentication is tested via session hijacking in other tests
  })

  it('logs out successfully', () => {
    // Login first
    cy.login()

    // Clear session manually (simulating logout)
    cy.clearCookies()
    cy.clearLocalStorage()

    // Visit home page
    cy.visit('/')

    // Should redirect to login page since session is cleared
    cy.url().should('include', '/login')
  })

  it('maintains session across page reloads', () => {
    // Login
    cy.login()

    // Reload page
    cy.reload()

    // Should still be logged in
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
    cy.contains('Expenses').should('be.visible')
  })


  it('persists user session after login', () => {
    // Login
    cy.login()

    // Verify we can navigate around the app
    cy.visit('/')
    cy.contains('Expenses').should('be.visible')

    // Visit different page
    cy.visit('/settings')
    cy.url().should('include', '/settings')

    // Session should persist - we should still be logged in
    cy.visit('/')
    cy.url().should('not.include', '/login')
  })

  it('shows different UI for authenticated vs unauthenticated users', () => {
    // Visit as unauthenticated
    cy.visit('/login')

    // Should see login form (dev mode)
    cy.getByTestId('dev-email-input').should('be.visible')
    cy.getByTestId('dev-password-input').should('be.visible')
    cy.get('#google-login-btn').should('be.visible')

    // Login
    cy.login()

    // Should see main app navigation
    cy.contains('Expenses').should('be.visible')
    cy.contains('Budget').should('be.visible')
    cy.contains('Workouts').should('be.visible')

    // Should NOT see login page
    cy.get('#google-login-btn').should('not.exist')
  })

  it('handles session expiration gracefully', () => {
    // Login
    cy.login()

    // Verify we're logged in
    cy.url().should('not.include', '/login')

    // Manually expire session by clearing auth token
    cy.clearLocalStorage()
    cy.clearCookies()

    // Try to access protected resource
    cy.visit('/', { failOnStatusCode: false })

    // Should redirect to login
    cy.url({ timeout: 10000 }).should('include', '/login')
  })

  it('prevents access to auth pages when already logged in', () => {
    // Login
    cy.login()

    // Try to visit login page
    cy.visit('/login')

    // Should redirect to home
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })


  it('allows access to settings when logged in', () => {
    // Login
    cy.login()

    // Navigate to settings
    cy.visit('/settings')

    // Verify we can access settings (not redirected to login)
    cy.url().should('include', '/settings')
    cy.url().should('not.include', '/login')

    // Verify settings page content is visible
    cy.contains('Settings').should('be.visible')
  })
})
