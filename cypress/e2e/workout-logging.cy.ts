/// <reference types="cypress" />

describe('Workout Logging Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login()

    // Navigate to workouts view
    cy.visit('/')
    cy.contains('Workouts').click()
  })

  it('starts a workout from template', () => {
    // Assumes "Push Day" template exists or create one
    cy.getByTestId('workout-templates-btn').click()

    // Select a template (or create one)
    cy.contains('Push Day').click()

    // Start workout from template
    cy.get('button').contains('Start Workout').click()

    // Verify workout started
    cy.contains('Workout in Progress').should('be.visible')
    cy.getByTestId('workout-timer').should('be.visible')
  })

  it('creates a custom workout from scratch', () => {
    // Click start workout button
    cy.getByTestId('start-workout-btn').click()

    // Choose "Custom Workout" option
    cy.get('button').contains('Custom Workout').click()

    // Select exercises from database
    cy.getByTestId('add-exercise-btn').click()

    // Search for exercise
    cy.get('input[placeholder="Search exercises"]').type('Bench Press')
    cy.contains('Bench Press').click()

    // Verify exercise added
    cy.contains('Bench Press').should('be.visible')
  })

  it('logs sets with weight and reps', () => {
    // Start a workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add exercise
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Squat').click()

    // Log first set
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('100')
    cy.get('input[name="reps"]').type('10')
    cy.get('button').contains('Save Set').click()

    // Verify set logged
    cy.contains('100 kg × 10 reps').should('be.visible')

    // Log second set
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('110')
    cy.get('input[name="reps"]').type('8')
    cy.get('button').contains('Save Set').click()

    // Verify second set
    cy.contains('110 kg × 8 reps').should('be.visible')
  })

  it('calculates volume correctly (weight × reps)', () => {
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add deadlift
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Deadlift').click()

    // Log set: 150kg × 5 reps = 750kg volume
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('150')
    cy.get('input[name="reps"]').type('5')
    cy.get('button').contains('Save Set').click()

    // Verify volume calculation
    cy.contains('Volume: 750 kg').should('be.visible')
  })

  it('detects personal record (PR) for weight', () => {
    // Seed previous workout with lower weight
    cy.seedWorkout({
      exercises_completed: [
        {
          exercise_id: 'bench-press',
          sets: [
            { weight: 80, reps: 8, completed: true },
          ],
        },
      ],
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Start new workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add bench press
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Bench Press').click()

    // Log set with higher weight (PR)
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('90')
    cy.get('input[name="reps"]').type('8')
    cy.get('button').contains('Save Set').click()

    // Verify PR badge appears
    cy.getByTestId('pr-badge').should('be.visible')
    cy.contains('New PR!').should('be.visible')
  })

  it('detects personal record (PR) for reps', () => {
    // Seed previous workout
    cy.seedWorkout({
      exercises_completed: [
        {
          exercise_id: 'pull-ups',
          sets: [
            { weight: 0, reps: 10, completed: true },
          ],
        },
      ],
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Start new workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add pull-ups
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Pull-ups').click()

    // Log set with more reps (PR)
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="reps"]').type('12')
    cy.get('button').contains('Save Set').click()

    // Verify PR badge
    cy.getByTestId('pr-badge').should('be.visible')
    cy.contains('12 reps').should('be.visible')
  })

  it('completes workout and saves to database', () => {
    // Start workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add exercise and log set
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Squat').click()

    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('100')
    cy.get('input[name="reps"]').type('10')
    cy.get('button').contains('Save Set').click()

    // Complete workout
    cy.get('button').contains('Finish Workout').click()

    // Verify success message
    cy.checkToast('Workout saved', 'success')

    // Verify workout appears in history
    cy.contains('Today').should('be.visible')
    cy.contains('Squat').should('be.visible')
  })

  it('displays workout summary after completion', () => {
    // Start and complete workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add multiple exercises
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Bench Press').click()

    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('80')
    cy.get('input[name="reps"]').type('10')
    cy.get('button').contains('Save Set').click()

    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Squat').click()

    cy.getByTestId('add-set-btn').last().click()
    cy.get('input[name="weight"]').type('120')
    cy.get('input[name="reps"]').type('8')
    cy.get('button').contains('Save Set').click()

    // Complete workout
    cy.get('button').contains('Finish Workout').click()

    // Verify summary shows metrics
    cy.contains('Workout Summary').should('be.visible')
    cy.contains('Total Volume').should('be.visible')
    cy.contains('Exercises').should('be.visible')
    cy.contains('2 exercises').should('be.visible') // Bench + Squat
  })

  it('uses rest timer between sets', () => {
    // Start workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    // Add exercise
    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Bench Press').click()

    // Log first set
    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('80')
    cy.get('input[name="reps"]').type('10')
    cy.get('button').contains('Save Set').click()

    // Rest timer should start automatically
    cy.getByTestId('rest-timer').should('be.visible')
    cy.contains('Rest: 90s').should('be.visible') // Default rest time

    // Timer should count down
    cy.wait(2000)
    cy.contains('Rest: 88s').should('be.visible')

    // Can skip rest
    cy.getByTestId('skip-rest-btn').click()
    cy.getByTestId('rest-timer').should('not.exist')
  })

  it('allows toggling favorite exercises', () => {
    // Navigate to exercises database
    cy.getByTestId('exercises-library-btn').click()

    // Find exercise and toggle favorite
    cy.contains('Bench Press').parents('[data-testid="exercise-card"]').within(() => {
      cy.getByTestId('favorite-btn').click()
    })

    // Verify favorite status
    cy.checkToast('Added to favorites', 'success')

    // Filter by favorites
    cy.getByTestId('filter-favorites-btn').click()

    // Verify only favorites shown
    cy.contains('Bench Press').should('be.visible')
  })

  it('tracks workout consistency (streak)', () => {
    // Seed workouts for consecutive days
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    cy.seedWorkout({ date: twoDaysAgo.toISOString() })
    cy.seedWorkout({ date: yesterday.toISOString() })
    cy.seedWorkout({ date: today.toISOString() })

    cy.reload()
    cy.waitForQueryToSettle()

    // Navigate to analytics/stats
    cy.contains('Analytics').click()

    // Verify streak displayed
    cy.contains('3-day streak').should('be.visible')
    cy.getByTestId('streak-badge').should('be.visible')
  })

  it('updates exercise history after workout', () => {
    // Complete a workout
    cy.getByTestId('start-workout-btn').click()
    cy.get('button').contains('Custom Workout').click()

    cy.getByTestId('add-exercise-btn').click()
    cy.contains('Deadlift').click()

    cy.getByTestId('add-set-btn').first().click()
    cy.get('input[name="weight"]').type('150')
    cy.get('input[name="reps"]').type('5')
    cy.get('button').contains('Save Set').click()

    cy.get('button').contains('Finish Workout').click()
    cy.waitForQueryToSettle()

    // Navigate to exercise history
    cy.getByTestId('exercises-library-btn').click()
    cy.contains('Deadlift').click()

    // Verify history updated
    cy.contains('History').click()
    cy.contains('150 kg × 5 reps').should('be.visible')
    cy.contains('Today').should('be.visible')
  })
})
