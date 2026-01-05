-- Migration: Add recurring expenses management
-- This migration adds a recurring_expenses table for users to manage subscriptions and recurring payments

-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,  -- e.g., "Netflix", "Spotify Premium"
    merchant TEXT NOT NULL,  -- Merchant name for matching
    category TEXT NOT NULL DEFAULT 'Other',
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',

    -- Recurrence settings
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    interval_days INTEGER,  -- For custom frequency, NULL otherwise

    -- Schedule tracking
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL if ongoing
    next_due_date DATE NOT NULL,
    last_processed_date DATE,  -- Last time we auto-created an expense

    -- Status and settings
    is_active BOOLEAN DEFAULT true,
    auto_create BOOLEAN DEFAULT false,  -- Auto-create expenses when due
    notify_before_days INTEGER DEFAULT 1,  -- Days before due date to notify

    -- Detection metadata
    is_detected BOOLEAN DEFAULT false,  -- True if created by auto-detection
    confidence_score INTEGER,  -- 0-100, from detection algorithm
    source TEXT NOT NULL CHECK (source IN ('manual', 'detected')),

    -- Skip tracking (array of dates to skip)
    skipped_dates DATE[] DEFAULT ARRAY[]::DATE[],

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due_date ON recurring_expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_merchant ON recurring_expenses(merchant);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_is_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_auto_create ON recurring_expenses(auto_create) WHERE auto_create = true;

-- Enable Row Level Security
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own recurring expenses
CREATE POLICY "Users can view their own recurring expenses"
    ON recurring_expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring expenses"
    ON recurring_expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring expenses"
    ON recurring_expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring expenses"
    ON recurring_expenses FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(
    input_date DATE,
    frequency_type TEXT,
    custom_interval INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
BEGIN
    RETURN CASE frequency_type
        WHEN 'weekly' THEN input_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN input_date + INTERVAL '14 days'
        WHEN 'monthly' THEN input_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN input_date + INTERVAL '3 months'
        WHEN 'yearly' THEN input_date + INTERVAL '1 year'
        WHEN 'custom' THEN
            CASE
                WHEN custom_interval IS NOT NULL THEN input_date + (custom_interval || ' days')::INTERVAL
                ELSE input_date + INTERVAL '30 days'  -- Default to monthly
            END
        ELSE input_date + INTERVAL '1 month'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to advance next_due_date when an expense is created
CREATE OR REPLACE FUNCTION advance_recurring_expense_due_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only advance if this expense matches a recurring expense pattern
    UPDATE recurring_expenses
    SET
        next_due_date = calculate_next_due_date(next_due_date, frequency, interval_days),
        last_processed_date = NEW.transaction_date::DATE,
        updated_at = TIMEZONE('utc', NOW())
    WHERE
        user_id = NEW.user_id
        AND is_active = true
        AND auto_create = true
        AND LOWER(TRIM(merchant)) = LOWER(TRIM(NEW.merchant))
        AND NEW.transaction_date::DATE >= next_due_date - INTERVAL '3 days'  -- Within 3 days before due
        AND NEW.transaction_date::DATE <= next_due_date + INTERVAL '7 days';  -- Or up to 7 days after

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-advance next_due_date when matching expense is created
CREATE TRIGGER advance_recurring_on_expense_insert
    AFTER INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION advance_recurring_expense_due_date();

-- Add comment to table
COMMENT ON TABLE recurring_expenses IS 'Stores user-defined and auto-detected recurring expenses/subscriptions with scheduling and auto-creation support';
