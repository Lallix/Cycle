-- ============================================================
-- CYCLE — Budget App
-- Full Supabase Schema with RLS, Triggers, and Seed Data
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  cycle_start_day INTEGER DEFAULT 25 CHECK (cycle_start_day BETWEEN 1 AND 28),
  currency TEXT DEFAULT 'ZAR',
  monthly_income NUMERIC(12,2) DEFAULT 5360.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#D4AF37',
  budget_amount NUMERIC(12,2),
  is_variable BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INCOME
-- ============================================================
CREATE TABLE income (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own income" ON income FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  account TEXT DEFAULT 'Capitec' CHECK (account IN ('Capitec', 'FNB', 'Cash')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RECURRING EXPENSES
-- ============================================================
CREATE TABLE recurring_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  account TEXT DEFAULT 'FNB' CHECK (account IN ('Capitec', 'FNB', 'Cash')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  paid_this_cycle BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  cycle_key TEXT, -- e.g. "2025-06" to track which cycle was paid
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring expenses" ON recurring_expenses FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SAVING GOALS
-- ============================================================
CREATE TABLE saving_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  monthly_contribution NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saving goals" ON saving_goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SAVING TRANSACTIONS
-- ============================================================
CREATE TABLE saving_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES saving_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saving_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saving transactions" ON saving_transactions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    CASE WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Seed default categories for new user
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_data_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_groceries_id UUID;
  v_transport_id UUID;
  v_eating_id UUID;
  v_entertainment_id UUID;
  v_clothing_id UUID;
  v_kids_id UUID;
  v_medical_id UUID;
  v_petrol_id UUID;
  v_fixed_id UUID;
BEGIN
  -- Variable budgeted categories
  INSERT INTO categories (user_id, name, icon, color, budget_amount, is_variable, sort_order)
  VALUES
    (p_user_id, 'Groceries',          '🛒', '#3DD598', 650.00,  TRUE, 1),
    (p_user_id, 'Transport',          '🚌', '#D4AF37', 150.00,  TRUE, 2),
    (p_user_id, 'Eating Out',         '🍽️', '#FF6B6B', 500.00,  TRUE, 3),
    (p_user_id, 'Entertainment',      '🎬', '#9B59B6', 200.00,  TRUE, 4),
    (p_user_id, 'Clothing',           '👗', '#E91E63', 300.00,  TRUE, 5),
    (p_user_id, 'Kids / School',      '🎒', '#00BCD4', 100.00,  TRUE, 6),
    (p_user_id, 'Medical',            '💊', '#4CAF50', 200.00,  TRUE, 7),
    (p_user_id, 'Petrol / Fuel',      '⛽', '#FF9800', 800.00,  TRUE, 8),
    (p_user_id, 'General',            '💳', '#888888', NULL,    TRUE, 9),
    (p_user_id, 'Fixed Expenses',     '🔒', '#607D8B', NULL,    FALSE, 10)
  RETURNING id INTO v_fixed_id;

  -- Get category IDs for recurring expense seeds
  SELECT id INTO v_fixed_id FROM categories WHERE user_id = p_user_id AND name = 'Fixed Expenses';

  -- Recurring fixed expenses
  INSERT INTO recurring_expenses (user_id, description, amount, due_day, account, category_id, sort_order)
  VALUES
    (p_user_id, 'Rent',             1200.00, 1,  'Capitec', v_fixed_id, 1),
    (p_user_id, 'Medical Aid',       280.00, 1,  'Capitec', v_fixed_id, 2),
    (p_user_id, 'Bank Charges',       10.00, 1,  'FNB',     v_fixed_id, 3),
    (p_user_id, 'Electricity / Gas', 152.00, 1,  'Capitec', v_fixed_id, 4),
    (p_user_id, 'Netflix',            14.00, 7,  'FNB',     v_fixed_id, 5),
    (p_user_id, 'Xbox',               15.00, 7,  'FNB',     v_fixed_id, 6),
    (p_user_id, 'Internet / Ziggo',   50.00, 7,  'FNB',     v_fixed_id, 7),
    (p_user_id, 'School Fees',        62.00, 15, 'FNB',     v_fixed_id, 8),
    (p_user_id, 'SA House Bond',     125.00, 25, 'FNB',     v_fixed_id, 9);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: Auto-seed categories for new user
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_default_data_for_user(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_recurring_user_id ON recurring_expenses(user_id);
CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_saving_goals_user_id ON saving_goals(user_id);

-- ============================================================
-- Admin helper: view all users (admin only)
-- ============================================================
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT
  p.id,
  p.full_name,
  p.role,
  p.currency,
  p.cycle_start_day,
  p.created_at,
  au.email,
  au.last_sign_in_at
FROM profiles p
JOIN auth.users au ON au.id = p.id;

-- Grant access only to admins via RLS on profiles
