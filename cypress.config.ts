import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',

    // Mobile-first viewport (iPhone SE dimensions)
    viewportWidth: 375,
    viewportHeight: 667,

    // Test configuration
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    // Video and screenshot settings
    video: false, // Disable video for faster runs
    screenshotOnRunFailure: true,

    // Timeouts
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,

    // Retry configuration
    retries: {
      runMode: 2, // Retry failed tests twice in CI
      openMode: 0, // No retries in interactive mode
    },

    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message)
          return null
        },

        // Sign in test user with email/password
        async signInTestUser() {
          const { createClient } = require('@supabase/supabase-js')

          const supabase = createClient(
            config.env.NEXT_PUBLIC_SUPABASE_URL,
            config.env.SUPABASE_ANON_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          )

          // Sign in with email/password
          const { data, error } = await supabase.auth.signInWithPassword({
            email: config.env.TEST_USER_EMAIL,
            password: config.env.TEST_USER_PASSWORD,
          })

          if (error) {
            console.error('Error signing in:', error)
            return null
          }

          // Return the full session (access_token, refresh_token, user, etc.)
          return data.session
        },
      })
    },

    // Environment variables
    env: {
      // Add test user credentials (override in cypress.env.json)
      testEmail: 'test@test.com',
      testPassword: 'test',
    },
  },

  // Component testing configuration (optional for future use)
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
  },
})
