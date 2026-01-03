/// <reference types="cypress" />

describe('Calorie Tracking Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login()

    // Navigate to calories view
    cy.visit('/')
    cy.contains('Calories').click()
  })

  it('logs a meal with manual calorie input', () => {
    // Click add meal button
    cy.getByTestId('add-meal-btn').click()

    // Fill out meal form
    cy.get('input[name="description"]').type('Chicken Rice')
    cy.get('input[name="calories"]').clear().type('650')
    cy.get('select[name="meal_time"]').select('lunch')

    // Submit form
    cy.get('button[type="submit"]').contains('Add Meal').click()

    // Verify success toast
    cy.checkToast('Meal logged', 'success')

    // Verify meal appears in list
    cy.contains('Chicken Rice').should('be.visible')
    cy.contains('650 cal').should('be.visible')
    cy.contains('Lunch').should('be.visible')
  })

  it('uses AI to estimate calories from description', () => {
    cy.getByTestId('add-meal-btn').click()

    // Type meal description without calories
    cy.get('input[name="description"]').type('Large pizza margherita')

    // Click AI estimate button
    cy.getByTestId('ai-estimate-btn').click()

    // Wait for LLM response
    cy.contains('Estimating', { timeout: 10000 }).should('be.visible')

    // Verify calories auto-filled
    cy.get('input[name="calories"]').should('have.value').and('not.be.empty')

    // Verify estimate is reasonable (500-1500 cal for pizza)
    cy.get('input[name="calories"]').invoke('val').then((val) => {
      const calories = parseInt(val as string)
      expect(calories).to.be.greaterThan(500)
      expect(calories).to.be.lessThan(1500)
    })
  })

  it('auto-creates meal from food expense', () => {
    // Navigate to expenses
    cy.contains('Expenses').click()

    // Create food expense
    cy.getByTestId('add-expense-btn').click()
    cy.get('input[name="amount"]').clear().type('85000')
    cy.get('input[name="merchant"]').clear().type('Pho Restaurant')
    cy.get('select[name="category"]').select('Food')
    cy.get('button[type="submit"]').click()

    cy.waitForQueryToSettle()

    // Navigate back to calories
    cy.contains('Calories').click()

    // Verify meal auto-created
    cy.contains('Pho Restaurant').should('be.visible')
    cy.contains('lunch').should('be.visible') // Default meal time
  })

  it('displays daily calorie total', () => {
    const today = new Date().toISOString().split('T')[0]

    // Seed multiple meals for today
    cy.seedMeal({ description: 'Breakfast', calories: 400, meal_time: 'breakfast', date: today })
    cy.seedMeal({ description: 'Lunch', calories: 650, meal_time: 'lunch', date: today })
    cy.seedMeal({ description: 'Dinner', calories: 750, meal_time: 'dinner', date: today })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify total (1800 calories)
    cy.contains('1,800').should('be.visible')
    cy.contains('Total today').should('be.visible')
  })

  it('shows progress toward daily calorie goal', () => {
    const today = new Date().toISOString().split('T')[0]

    // Set calorie goal (via settings or API)
    cy.request({
      method: 'POST',
      url: '/api/calorie-goals',
      body: {
        daily_calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
      },
    })

    // Add meal (800 calories)
    cy.seedMeal({ description: 'Lunch', calories: 800, meal_time: 'lunch', date: today })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify progress bar shows 40% (800/2000)
    cy.getByTestId('calorie-progress-bar')
      .should('be.visible')
      .and('have.attr', 'aria-valuenow', '40')

    // Verify text shows remaining
    cy.contains('1,200 cal remaining').should('be.visible')
  })

  it('warns when exceeding daily calorie goal', () => {
    const today = new Date().toISOString().split('T')[0]

    // Set calorie goal
    cy.request({
      method: 'POST',
      url: '/api/calorie-goals',
      body: { daily_calories: 1500 },
    })

    // Add meals exceeding goal (1700 calories total)
    cy.seedMeal({ calories: 600, date: today })
    cy.seedMeal({ calories: 600, date: today })
    cy.seedMeal({ calories: 500, date: today })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify warning appears
    cy.contains('Over goal').should('be.visible')
    cy.getByTestId('calorie-warning-icon').should('be.visible')

    // Progress bar should be red/danger
    cy.getByTestId('calorie-progress-bar')
      .should('have.class', 'bg-destructive')
  })

  it('tracks macros (protein, carbs, fat)', () => {
    cy.getByTestId('add-meal-btn').click()

    // Add meal with macros
    cy.get('input[name="description"]').type('Grilled Chicken Breast')
    cy.get('input[name="calories"]').clear().type('300')
    cy.get('input[name="protein"]').clear().type('50')
    cy.get('input[name="carbs"]').clear().type('5')
    cy.get('input[name="fat"]').clear().type('8')
    cy.get('button[type="submit"]').click()

    // Verify macros displayed
    cy.contains('50g protein').should('be.visible')
    cy.contains('5g carbs').should('be.visible')
    cy.contains('8g fat').should('be.visible')
  })

  it('displays weekly calorie trend chart', () => {
    // Seed meals for past 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      cy.seedMeal({
        description: `Meal ${i}`,
        calories: 1500 + (i * 100),
        date: dateStr,
      })
    }

    cy.reload()
    cy.waitForQueryToSettle()

    // Navigate to analytics
    cy.contains('Analytics').click()

    // Verify weekly chart rendered
    cy.getByTestId('weekly-calorie-chart').should('be.visible')
    cy.contains('Weekly Calories').should('be.visible')
  })

  it('filters meals by meal time', () => {
    const today = new Date().toISOString().split('T')[0]

    // Seed meals for different times
    cy.seedMeal({ description: 'Breakfast Meal', meal_time: 'breakfast', date: today })
    cy.seedMeal({ description: 'Lunch Meal', meal_time: 'lunch', date: today })
    cy.seedMeal({ description: 'Dinner Meal', meal_time: 'dinner', date: today })

    cy.reload()
    cy.waitForQueryToSettle()

    // Filter by lunch
    cy.getByTestId('meal-time-filter').select('lunch')

    // Verify only lunch meals shown
    cy.contains('Lunch Meal').should('be.visible')
    cy.contains('Breakfast Meal').should('not.exist')
    cy.contains('Dinner Meal').should('not.exist')
  })

  it('allows editing meal after logging', () => {
    const today = new Date().toISOString().split('T')[0]

    // Seed meal
    cy.seedMeal({
      description: 'Old Meal',
      calories: 500,
      meal_time: 'lunch',
      date: today,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click on meal to expand
    cy.contains('Old Meal').click()

    // Click edit button
    cy.getByTestId('edit-meal-btn').click()

    // Update description
    cy.get('input[name="description"]').clear().type('Updated Meal')
    cy.get('input[name="calories"]').clear().type('600')
    cy.get('button[type="submit"]').contains('Update').click()

    // Verify update
    cy.checkToast('Meal updated', 'success')
    cy.contains('Updated Meal').should('be.visible')
    cy.contains('600 cal').should('be.visible')
  })

  it('allows deleting meal', () => {
    const today = new Date().toISOString().split('T')[0]

    // Seed meal
    cy.seedMeal({
      description: 'To Be Deleted',
      calories: 400,
      date: today,
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Click on meal to expand
    cy.contains('To Be Deleted').click()

    // Click delete button
    cy.getByTestId('delete-meal-btn').click()

    // Confirm deletion
    cy.get('button').contains('Delete').click()

    // Verify deletion
    cy.checkToast('Meal deleted', 'success')
    cy.contains('To Be Deleted').should('not.exist')
  })

  it('displays calorie deficit/surplus', () => {
    const today = new Date().toISOString().split('T')[0]

    // Set calorie goal (2000)
    cy.request({
      method: 'POST',
      url: '/api/calorie-goals',
      body: { daily_calories: 2000 },
    })

    // Add meals totaling 1700 calories (300 deficit)
    cy.seedMeal({ calories: 600, date: today })
    cy.seedMeal({ calories: 600, date: today })
    cy.seedMeal({ calories: 500, date: today })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify deficit displayed
    cy.contains('300 cal deficit').should('be.visible')
    cy.getByTestId('deficit-badge').should('be.visible')
  })

  it('syncs meal data with workout calorie burn', () => {
    const today = new Date().toISOString().split('T')[0]

    // Set calorie goal
    cy.request({
      method: 'POST',
      url: '/api/calorie-goals',
      body: { daily_calories: 2000 },
    })

    // Add meals (1800 cal)
    cy.seedMeal({ calories: 1800, date: today })

    // Log workout (burns 400 cal)
    cy.seedWorkout({
      date: new Date().toISOString(),
      exercises_completed: [
        {
          exercise_id: 'running',
          duration_minutes: 30,
          calories_burned: 400,
        },
      ],
    })

    cy.reload()
    cy.waitForQueryToSettle()

    // Verify adjusted calorie target (2000 + 400 = 2400)
    cy.contains('2,400 cal goal').should('be.visible')
    cy.contains('600 cal remaining').should('be.visible')
  })
})
