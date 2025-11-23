-- Create budgets table for monthly category budgets
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(category, month)
);

-- Add RLS policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON budgets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON budgets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON budgets
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON budgets
    FOR DELETE USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
