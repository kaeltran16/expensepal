import { withAuth } from '@/lib/api/middleware'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { getUserEmailServices } from '@/lib/email-service'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface ParsedExpense {
  amount: number
  currency: string
  transactionDate: string
  merchant: string
  source: string
  emailSubject?: string
  category?: string
  emailUid?: string
  emailAccount?: string
  transactionType?: string
}

interface SuccessfulExpense {
  expense: ParsedExpense
  expenseId: string
}

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (_request, user) => {
  // Create authenticated Supabase client (respects RLS)
  const supabase = createClient()
  
  // get user-specific email services from database using authenticated client
  const emailServices = await getUserEmailServices(supabase, user.id)

  // check if any email accounts are configured
  if (emailServices.length === 0) {
    return NextResponse.json(
      { error: 'No email accounts configured. Please add your email settings in Settings.' },
      { status: 400 }
    )
  }

  console.log(`Syncing from ${emailServices.length} email account(s)...`)
  console.log(`Associating expenses with user: ${user.id} (${user.email})`)

  // Get already-processed email UIDs from database to avoid duplicates
  console.log('Fetching already-processed email UIDs from database...')
  const { data: processedRecords, error: fetchError } = await supabase
    .from('processed_emails')
    .select('email_uid, email_account')
    .eq('user_id', user.id)

  if (fetchError) {
    console.error('Error fetching processed emails:', fetchError)
    // Continue anyway - worst case we might get duplicates
  }

  // Create a Set for fast lookup: "email@example.com:12345"
  const processedUids = new Set<string>(
    (processedRecords || []).map(r => `${r.email_account}:${r.email_uid}`)
  )
  console.log(`Found ${processedUids.size} already-processed emails`)

  // Fetch expenses from all configured email accounts
  const fetchPromises = emailServices.map((service, index) => {
    console.log(`Fetching from email account ${index + 1}...`)
    return service.fetchUnreadExpenses(processedUids)
  })

  const allExpensesArrays = await Promise.all(fetchPromises)
  const expenses = allExpensesArrays.flat()

  if (expenses.length === 0) {
    return NextResponse.json({
      message: 'No new expenses found',
      newExpenses: 0,
      count: 0,
      duplicates: 0,
      failed: 0,
      mealsCreated: 0,
      accounts: emailServices.length,
      expenses: [],
    })
  }

  console.log(`Found ${expenses.length} total expenses from all accounts`)

  // Insert expenses into database
  const insertResults = []
  let successful = 0
  let failed = 0
  let duplicates = 0
  let mealsCreated = 0

  // First pass: Insert all expenses
  const successfulExpenses: SuccessfulExpense[] = []

  for (const expense of expenses) {
    console.log(`Attempting to insert: ${expense.amount} ${expense.currency} at ${expense.merchant}`)

    const { data, error } = await supabase.from('expenses').insert([
      {
        user_id: user.id,
        transaction_type: expense.transactionType,
        amount: expense.amount,
        currency: expense.currency,
        transaction_date: expense.transactionDate,
        merchant: expense.merchant,
        source: expense.source,
        email_subject: expense.emailSubject,
        category: expense.category,
      },
    ]).select()

    if (error) {
      console.error(`Failed to insert expense:`, error)

      // Check if it's a duplicate (unique constraint violation)
      if (error.code === '23505') {
        console.log(`Duplicate expense detected (already exists in database)`)
        console.log(`Expense UID: ${expense.emailUid}, Account: ${expense.emailAccount}`)
        duplicates++

        // still store the uid to prevent re-parsing this email
        if (expense.emailUid && expense.emailAccount) {
          const { error: uidError } = await supabase
            .from('processed_emails')
            .insert({
              user_id: user.id,
              email_account: expense.emailAccount,
              email_uid: expense.emailUid,
              subject: expense.emailSubject,
              expense_id: null, // no expense id since insert failed
            })

          if (uidError && uidError.code !== '23505') {
            console.error('Failed to store processed email UID for duplicate:', uidError)
          } else if (!uidError) {
            console.log(`✓ Stored UID for duplicate expense: ${expense.emailUid}`)
          }
        }
      } else {
        failed++
      }

      insertResults.push({ success: false, error: error.message, expense })
    } else {
      console.log(`✓ Successfully inserted expense with ID: ${data[0]?.id}`)
      successful++
      insertResults.push({ success: true, data, expense })

      // Store processed email UID in database to prevent future duplicates
      if (expense.emailUid && expense.emailAccount) {
        const { error: uidError } = await supabase
          .from('processed_emails')
          .insert({
            user_id: user.id,
            email_account: expense.emailAccount,
            email_uid: expense.emailUid,
            subject: expense.emailSubject,
            expense_id: data[0]?.id,
          })

        if (uidError) {
          // Don't fail the whole sync, just log it
          // Duplicate UID constraint violations are expected (23505)
          if (uidError.code !== '23505') {
            console.error('Failed to store processed email UID:', uidError)
          }
        } else {
          console.log(`✓ Stored processed UID: ${expense.emailUid}`)
        }
      }

      // Track successful Food expenses for batch meal estimation
      if (expense.category === 'Food' && data[0]?.id) {
        successfulExpenses.push({ expense, expenseId: data[0].id })
      }
    }
  }

  // Second pass: Batch process meal estimations for all Food expenses
  if (successfulExpenses.length > 0) {
    console.log(`🍔 Batch processing ${successfulExpenses.length} Food expense(s) for meal tracking...`)

    try {
      // Prepare food descriptions for batch estimation
      const foodDescriptions = successfulExpenses.map((item) => item.expense.merchant)

      // Make a SINGLE batch LLM call for all foods
      const estimates = await calorieEstimator.estimateBatch(
        supabase,
        foodDescriptions,
        {
          additionalInfo: 'Food orders from email sync (GrabFood/delivery)',
        }
      )

      // Create meal entries for each estimate
      const mealInserts = successfulExpenses.map((item, index) => {
        const estimate = estimates[index]
        if (!estimate) {
          throw new Error(`Missing estimate for index ${index}`)
        }
        const { expense, expenseId } = item

        // Determine meal time based on transaction time (GMT+7)
        const mealTime = getMealTimeFromDate(expense.transactionDate)

        return {
          user_id: user.id,
          name: expense.merchant,
          calories: estimate.calories,
          protein: estimate.protein ?? null,
          carbs: estimate.carbs ?? null,
          fat: estimate.fat ?? null,
          meal_time: mealTime,
          meal_date: expense.transactionDate,
          source: 'email' as const,
          confidence: estimate.confidence ?? null,
          expense_id: expenseId,
          llm_reasoning: estimate.reasoning ?? null,
          notes: `Auto-tracked from ${expense.merchant} (${expense.amount} ${expense.currency})`,
        }
      })

      // Batch insert all meals
      const { data: mealDataArray, error: mealError } = await supabase
        .from('meals')
        .insert(mealInserts)

      if (mealError) {
        console.error(`Failed to create meal entries:`, mealError)
      } else {
        mealsCreated = (mealDataArray as unknown as { length: number }[])?.length ?? 0
        console.log(`✓ Created ${mealsCreated} meal entries in a single batch`)
      }
    } catch (batchError) {
      console.error(`Error in batch meal estimation:`, batchError)
      // Don't fail the whole sync if meal tracking fails
    }
  }

  console.log(`\n=== SYNC SUMMARY ===`)
  console.log(`Total parsed: ${expenses.length}`)
  console.log(`Successfully inserted: ${successful}`)
  console.log(`Duplicates skipped: ${duplicates}`)
  console.log(`Failed: ${failed}`)
  console.log(`Meals auto-tracked: ${mealsCreated}`)

  // update last_sync_at timestamp for user's email settings
  try {
    // Note: user_email_settings table may not have generated types yet
    await (supabase as SupabaseClient<Database>)
      .from('user_email_settings' as never)
      .update({ last_sync_at: new Date().toISOString() } as never)
      .eq('user_id' as never, user.id as never)
  } catch (syncUpdateError) {
    // don't fail the whole sync if timestamp update fails
    console.error('Failed to update last_sync_at:', syncUpdateError)
  }

  return NextResponse.json({
    message: `Synced ${successful} new expenses (${duplicates} duplicates skipped, ${failed} failed)`,
    newExpenses: successful,
    count: successful, // Keep for backwards compatibility
    duplicates,
    failed,
    mealsCreated,
    accounts: emailServices.length,
    results: insertResults,
  })
})

export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()

  // check if user has email settings configured
  // Note: user_email_settings table may not have generated types yet
  const { data: settings } = await (supabase as SupabaseClient<Database>)
    .from('user_email_settings' as never)
    .select('last_sync_at, is_enabled' as never)
    .eq('user_id' as never, user.id as never)
    .eq('is_enabled' as never, true as never)
    .limit(1)

  const configured = !!settings && settings.length > 0
  const lastSync = (settings?.[0] as { last_sync_at?: string } | undefined)?.last_sync_at || null

  return NextResponse.json({
    configured,
    lastSync,
  })
})
