import { mergeTests } from '@playwright/test'
import { test as authTest, expect } from './auth.fixture'
import { test as apiTest } from './api.fixture'
import { test as toastTest } from './toast.fixture'
import { test as analyticsTest } from './analytics.fixture'
export { createOfflineHelper, type OfflineHelper } from './offline.fixture'

// Merge all fixtures (offline is a helper function, not a fixture)
export const test = mergeTests(authTest, apiTest, toastTest, analyticsTest)

export { expect }
