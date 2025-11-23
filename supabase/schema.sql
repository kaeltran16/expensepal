-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_number TEXT,  -- Optional: only filled from email notifications
    cardholder TEXT,   -- Optional: only filled from email notifications
    transaction_type TEXT DEFAULT 'Expense',  -- Optional: defaults to 'Expense'
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    transaction_date TIMESTAMPTZ NOT NULL,
    merchant TEXT NOT NULL,  -- What you bought (description)
    category TEXT DEFAULT 'Other',  -- Food, Transport, Shopping, etc.
    notes TEXT,
    source TEXT NOT NULL CHECK (source IN ('manual', 'email')),
    email_subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create categories table for future use
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, color, icon) VALUES
    ('Food & Dining', '#FF6B6B', '🍔'),
    ('Shopping', '#4ECDC4', '🛍️'),
    ('Transportation', '#45B7D1', '🚗'),
    ('Entertainment', '#FFA07A', '🎬'),
    ('Bills & Utilities', '#98D8C8', '💡'),
    ('Healthcare', '#F7DC6F', '🏥'),
    ('Other', '#95A5A6', '📦')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - you can add auth later)
CREATE POLICY "Allow all operations on expenses" ON expenses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);
