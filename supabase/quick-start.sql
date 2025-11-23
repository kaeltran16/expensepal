-- Quick Start SQL for Expense Tracker
-- Copy and paste this entire file into Supabase SQL Editor for a fresh installation

-- ============================================
-- 1. CREATE EXPENSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_number TEXT,
    cardholder TEXT,
    transaction_type TEXT DEFAULT 'Expense',
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    transaction_date TIMESTAMPTZ NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    notes TEXT,
    source TEXT NOT NULL CHECK (source IN ('manual', 'email')),
    email_subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);

-- ============================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. CREATE CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INSERT DEFAULT CATEGORIES
-- ============================================

INSERT INTO categories (name, color, icon) VALUES
    ('Food', '#FF6B6B', '🍔'),
    ('Transport', '#45B7D1', '🚗'),
    ('Shopping', '#4ECDC4', '🛍️'),
    ('Entertainment', '#FFA07A', '🎬'),
    ('Bills', '#98D8C8', '💡'),
    ('Health', '#F7DC6F', '🏥'),
    ('Other', '#95A5A6', '📦')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE POLICIES (Public Access)
-- ============================================

DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;
CREATE POLICY "Allow all operations on expenses" ON expenses
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. VERIFY SETUP
-- ============================================

-- Check tables
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('expenses', 'categories');

-- Check row counts
SELECT 'Expenses count:' as label, COUNT(*) as count FROM expenses
UNION ALL
SELECT 'Categories count:' as label, COUNT(*) as count FROM categories;

-- Done!
SELECT '✅ Setup complete! Your database is ready.' as message;
