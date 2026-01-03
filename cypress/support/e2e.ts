// Import commands.ts using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Prevent TypeScript errors for Cypress global
/// <reference types="cypress" />

// Global before hook
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearLocalStorage()
  cy.clearCookies()

  // Set mobile viewport (already default in config, but ensure it's set)
  cy.viewport(375, 667)
})
