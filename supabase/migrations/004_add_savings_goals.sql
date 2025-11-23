-- Create savings_goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    deadline DATE,
    icon TEXT DEFAULT '🎯',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add RLS policies
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON savings_goals
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON savings_goals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON savings_goals
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON savings_goals
    FOR DELETE USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
