-- Create user_email_settings table for storing per-user email credentials
CREATE TABLE IF NOT EXISTS user_email_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    -- store app password (will be encrypted at application level)
    app_password TEXT NOT NULL,
    -- imap configuration
    imap_host TEXT NOT NULL DEFAULT 'imap.gmail.com',
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_tls BOOLEAN NOT NULL DEFAULT true,
    -- trusted senders (array of email addresses to process)
    trusted_senders TEXT[] DEFAULT ARRAY['info@card.vib.com.vn', 'no-reply@grab.com'],
    -- metadata
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- ensure one config per user per email
    UNIQUE(user_id, email_address)
);

-- create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id ON user_email_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_settings_enabled ON user_email_settings(is_enabled);

-- enable row level security
ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;

-- create policies (users can only access their own email settings)
CREATE POLICY "Users can view their own email settings" ON user_email_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email settings" ON user_email_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings" ON user_email_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email settings" ON user_email_settings
    FOR DELETE USING (auth.uid() = user_id);

-- create updated_at trigger
CREATE TRIGGER update_user_email_settings_updated_at BEFORE UPDATE ON user_email_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
