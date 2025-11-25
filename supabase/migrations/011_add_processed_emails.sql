-- Migration: Add processed_emails table for reliable email UID tracking
-- Description: Replace "mark as read" approach with database-tracked UIDs
-- This prevents accidental email opening and provides reliable duplicate detection

-- ============================================================================
-- Create processed_emails table
-- ============================================================================

CREATE TABLE IF NOT EXISTS processed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_account TEXT NOT NULL,  -- Email address (e.g., "user@gmail.com")
    email_uid TEXT NOT NULL,      -- IMAP UID (unique per account)
    subject TEXT,                 -- Email subject (for debugging/auditing)
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    
    -- Ensure each UID is only processed once per user per account
    CONSTRAINT unique_processed_email UNIQUE(user_id, email_account, email_uid)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Lookup processed emails by user
CREATE INDEX IF NOT EXISTS idx_processed_emails_user 
    ON processed_emails(user_id);

-- Fast lookup during sync (check if UID already processed)
CREATE INDEX IF NOT EXISTS idx_processed_emails_lookup 
    ON processed_emails(user_id, email_account, email_uid);

-- Query by processed date (for cleanup/analytics)
CREATE INDEX IF NOT EXISTS idx_processed_emails_date 
    ON processed_emails(processed_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own processed emails
CREATE POLICY "Users can view their own processed emails"
    ON processed_emails FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own processed emails (via authenticated API)
CREATE POLICY "Users can insert their own processed emails"
    ON processed_emails FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role (backend) can manage all processed emails
CREATE POLICY "Service role can manage processed emails"
    ON processed_emails FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Cleanup function (optional - for future use)
-- ============================================================================
-- Function to delete old processed email records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_processed_emails()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM processed_emails
    WHERE processed_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: To run cleanup, execute: SELECT cleanup_old_processed_emails();
-- Or set up a cron job in Supabase to run this weekly
