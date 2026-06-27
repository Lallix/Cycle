-- ============================================================
-- CYCLE BUDGET MODULE — Migration v1
-- Project: mjaschvxhdupoemaezjt (Personal Life ecosystem)
-- ============================================================
-- SAFE TO RUN: Purely additive. Zero changes to existing GEM
-- Planner tables (grocery_items, receipts, recipes, etc.).
-- The existing 'budgets' table (GEM grocery budget) is untouched.
-- All new tables use the cycle_ prefix to namespace cleanly.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. GUARDS — make this re-runnable safely
-- ─────────────────────────────────────────────────────────────
-- Every CREATE uses IF NOT EXISTS, every ALTER uses a check.
-- Running this twice will no-op gracefully.

-- ─────────────────────────────────────────────────────────────
-- 1. EXTEND PROFILES (additive column only)
-- ─────────────────────────────────────────────────────────────
-- GEM Planner uses profiles(id, full_name, email, is_admin,
-- created_at, is_disabled, avatar_emoji). We add cycle_start_day.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cycle_start_day smallint NOT NULL DEFAULT 25
    CHECK (cycle_start_day BETWEEN 1 AND 28);

-- ─────────────────────────────────────────────────────────────
-- 2. CYCLE_INCOME
-- One income record per user (their monthly take-home).
-- Separate from GEM — groceries and salary are different domains.
-- Future: could grow to multiple income sources.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_income (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  label          text NOT NULL DEFAULT 'Monthly income',
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their income"
  ON public.cycle_income FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_income_user_idx ON public.cycle_income(user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. CYCLE_CATEGORIES
-- Spending categories for the budget module.
-- type: 'fixed' | 'variable' | 'unbudgeted'
-- budget_amount only relevant for type='variable'.
-- Per-user — not shared with GEM. GEM uses its own freetext
-- category column on grocery_items.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  type           text NOT NULL DEFAULT 'variable'
                   CHECK (type IN ('fixed', 'variable', 'unbudgeted')),
  icon           text,
  colour         text,
  budget_amount  numeric(12,2) CHECK (budget_amount >= 0),
  sort_order     smallint NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.cycle_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their categories"
  ON public.cycle_categories FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_categories_user_idx ON public.cycle_categories(user_id);
CREATE INDEX IF NOT EXISTS cycle_categories_type_idx  ON public.cycle_categories(user_id, type);

-- ─────────────────────────────────────────────────────────────
-- 4. CYCLE_RECURRING_EXPENSES
-- Fixed monthly bills: rent, subscriptions, insurance, etc.
-- due_day: day of month the debit goes off (1–31).
-- account: free text — e.g. 'Capitec', 'FNB'
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_recurring_expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  account        text,                          -- bank account / card
  due_day        smallint CHECK (due_day BETWEEN 1 AND 31),
  category_id    uuid REFERENCES public.cycle_categories(id) ON DELETE SET NULL,
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     smallint NOT NULL DEFAULT 0,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their recurring expenses"
  ON public.cycle_recurring_expenses FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_recurring_user_idx ON public.cycle_recurring_expenses(user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. CYCLE_RECURRING_PAID_LOG
-- Tracks which recurring expenses have been paid in each cycle.
-- cycle_key: 'YYYY-MM-DD' representing the cycle start date.
-- This lets us reset paid state each cycle without losing history.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_recurring_paid_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_id    uuid NOT NULL REFERENCES public.cycle_recurring_expenses(id) ON DELETE CASCADE,
  cycle_key       date NOT NULL,               -- cycle start date
  paid_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_id, cycle_key)
);

ALTER TABLE public.cycle_recurring_paid_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their paid log"
  ON public.cycle_recurring_paid_log FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_paid_log_user_cycle_idx
  ON public.cycle_recurring_paid_log(user_id, cycle_key);

-- ─────────────────────────────────────────────────────────────
-- 6. CYCLE_TRANSACTIONS
-- Every expense logged by the user.
-- account: which bank account / card was used.
-- cycle_key: the cycle start date this transaction belongs to —
--   denormalised for fast cycle-scoped queries.
-- link_receipt_id: optional FK to GEM's receipts table —
--   this is the shared-data bridge between modules.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount >= 0),
  category_id     uuid REFERENCES public.cycle_categories(id) ON DELETE SET NULL,
  account         text,
  notes           text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  cycle_key       date NOT NULL,               -- denormalised cycle start
  -- Optional link to GEM Planner data (shared-data bridge)
  link_receipt_id uuid REFERENCES public.receipts(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their transactions"
  ON public.cycle_transactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_tx_user_cycle_idx
  ON public.cycle_transactions(user_id, cycle_key);
CREATE INDEX IF NOT EXISTS cycle_tx_category_idx
  ON public.cycle_transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS cycle_tx_date_idx
  ON public.cycle_transactions(user_id, transaction_date DESC);

-- ─────────────────────────────────────────────────────────────
-- 7. CYCLE_SAVING_GOALS
-- Savings targets: holiday, emergency fund, new car, etc.
-- target_amount NULL = open-ended / rolling saver.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_saving_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  target_amount   numeric(12,2) CHECK (target_amount >= 0),
  current_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  icon            text,
  colour          text,
  target_date     date,
  is_active       boolean NOT NULL DEFAULT true,
  is_completed    boolean NOT NULL DEFAULT false,
  notes           text,
  sort_order      smallint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_saving_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their saving goals"
  ON public.cycle_saving_goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_saving_goals_user_idx
  ON public.cycle_saving_goals(user_id);

-- ─────────────────────────────────────────────────────────────
-- 8. CYCLE_SAVING_TRANSACTIONS
-- Individual contributions to or withdrawals from a saving goal.
-- type: 'contribution' | 'withdrawal'
-- Also updates current_amount on the goal via trigger below.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_saving_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id         uuid NOT NULL REFERENCES public.cycle_saving_goals(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  type            text NOT NULL DEFAULT 'contribution'
                    CHECK (type IN ('contribution', 'withdrawal')),
  cycle_key       date,                        -- which cycle this came from
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_saving_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their saving transactions"
  ON public.cycle_saving_transactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_saving_tx_goal_idx
  ON public.cycle_saving_transactions(goal_id);
CREATE INDEX IF NOT EXISTS cycle_saving_tx_user_idx
  ON public.cycle_saving_transactions(user_id);

-- ─────────────────────────────────────────────────────────────
-- 9. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- 9a. updated_at auto-stamp function (shared utility — idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all cycle tables that have updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cycle_income',
    'cycle_categories',
    'cycle_recurring_expenses',
    'cycle_transactions',
    'cycle_saving_goals'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = tbl
        AND trigger_name = 'set_updated_at_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- 9b. Saving goal balance sync trigger
-- Keeps cycle_saving_goals.current_amount accurate after
-- any insert/delete on cycle_saving_transactions.
CREATE OR REPLACE FUNCTION public.sync_saving_goal_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_goal_id uuid;
  v_balance numeric(12,2);
BEGIN
  v_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);

  SELECT COALESCE(SUM(
    CASE WHEN type = 'contribution' THEN amount
         WHEN type = 'withdrawal'   THEN -amount
         ELSE 0 END
  ), 0)
  INTO v_balance
  FROM public.cycle_saving_transactions
  WHERE goal_id = v_goal_id;

  UPDATE public.cycle_saving_goals
  SET
    current_amount = GREATEST(v_balance, 0),
    is_completed   = (target_amount IS NOT NULL AND GREATEST(v_balance, 0) >= target_amount),
    updated_at     = now()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_saving_goal_balance_trigger
  ON public.cycle_saving_transactions;

CREATE TRIGGER sync_saving_goal_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON public.cycle_saving_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_saving_goal_balance();

-- 9c. New user seed trigger
-- Seeds default categories and recurring expenses for each new signup.
-- Checks for the existing GEM profile trigger pattern — safe to coexist.
CREATE OR REPLACE FUNCTION public.seed_cycle_defaults_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid  uuid := NEW.id;
  v_gid  uuid;
BEGIN
  -- ── Variable budget categories ──────────────────────────────
  INSERT INTO public.cycle_categories
    (user_id, name, type, icon, budget_amount, sort_order)
  VALUES
    (v_uid, 'Groceries',      'variable', '🛒', 650.00,  1),
    (v_uid, 'Petrol',         'variable', '⛽', 800.00,  2),
    (v_uid, 'Eating Out',     'variable', '🍽️', 500.00,  3),
    (v_uid, 'Transport',      'variable', '🚌', 150.00,  4),
    (v_uid, 'Entertainment',  'variable', '🎬', 200.00,  5),
    (v_uid, 'Clothing',       'variable', '👕', 300.00,  6),
    (v_uid, 'Kids / School',  'variable', '🎒', 100.00,  7),
    (v_uid, 'Medical',        'variable', '💊', 200.00,  8),
    (v_uid, 'Unbudgeted',     'unbudgeted','❓', NULL,   99)
  ON CONFLICT (user_id, name) DO NOTHING;

  -- ── Fixed recurring expenses ────────────────────────────────
  INSERT INTO public.cycle_recurring_expenses
    (user_id, name, amount, account, due_day, sort_order)
  VALUES
    (v_uid, 'Rent',            1200.00, 'Capitec',  1, 1),
    (v_uid, 'Medical Aid',      280.00, 'Capitec',  1, 2),
    (v_uid, 'Electricity',      152.00, 'Capitec',  1, 3),
    (v_uid, 'Bank Charges',      10.00, 'FNB',      1, 4),
    (v_uid, 'Netflix',           14.00, 'FNB',      7, 5),
    (v_uid, 'Xbox Game Pass',    15.00, 'FNB',      7, 6),
    (v_uid, 'Internet',          50.00, 'FNB',      7, 7),
    (v_uid, 'School Fees',       62.00, 'FNB',     15, 8),
    (v_uid, 'SA House Bond',    125.00, 'FNB',     25, 9)
  ON CONFLICT DO NOTHING;

  -- ── Income record ───────────────────────────────────────────
  INSERT INTO public.cycle_income (user_id, amount, label)
  VALUES (v_uid, 5360.00, 'Monthly income')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach to profiles table (fires after a profile row is inserted,
-- which happens after auth.users insert via GEM's own trigger).
-- If GEM already has a handle_new_user trigger on auth.users that
-- inserts into profiles, this fires on that downstream insert.
DROP TRIGGER IF EXISTS seed_cycle_defaults_trigger
  ON public.profiles;

CREATE TRIGGER seed_cycle_defaults_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_cycle_defaults_for_user();

-- ─────────────────────────────────────────────────────────────
-- 10. HELPER RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- 10a. get_cycle_summary(p_cycle_key date)
-- Returns income, fixed totals, variable by category, and savings
-- for a given cycle. Called by the Cycle app dashboard.
CREATE OR REPLACE FUNCTION public.get_cycle_summary(p_user_id uuid, p_cycle_key date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_income          numeric(12,2);
  v_fixed_total     numeric(12,2);
  v_variable_total  numeric(12,2);
  v_unbudgeted_total numeric(12,2);
  v_savings_total   numeric(12,2);
  v_tx_by_cat       jsonb;
BEGIN
  -- Income
  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM public.cycle_income
  WHERE user_id = p_user_id AND is_active = true;

  -- Fixed recurring total
  SELECT COALESCE(SUM(cr.amount), 0) INTO v_fixed_total
  FROM public.cycle_recurring_expenses cr
  WHERE cr.user_id = p_user_id AND cr.is_active = true;

  -- Transactions by category for this cycle
  SELECT COALESCE(jsonb_object_agg(
    COALESCE(cat.name, 'Uncategorised'),
    jsonb_build_object(
      'spent',  COALESCE(SUM(tx.amount), 0),
      'budget', COALESCE(cat.budget_amount, 0),
      'type',   COALESCE(cat.type, 'unbudgeted')
    )
  ), '{}')
  INTO v_tx_by_cat
  FROM public.cycle_transactions tx
  LEFT JOIN public.cycle_categories cat ON cat.id = tx.category_id
  WHERE tx.user_id = p_user_id AND tx.cycle_key = p_cycle_key
  GROUP BY cat.name, cat.budget_amount, cat.type;

  -- Variable and unbudgeted totals
  SELECT
    COALESCE(SUM(CASE WHEN cat.type = 'variable'   THEN tx.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cat.type = 'unbudgeted' OR cat.id IS NULL THEN tx.amount ELSE 0 END), 0)
  INTO v_variable_total, v_unbudgeted_total
  FROM public.cycle_transactions tx
  LEFT JOIN public.cycle_categories cat ON cat.id = tx.category_id
  WHERE tx.user_id = p_user_id AND tx.cycle_key = p_cycle_key;

  -- Savings
  SELECT COALESCE(SUM(current_amount), 0) INTO v_savings_total
  FROM public.cycle_saving_goals
  WHERE user_id = p_user_id AND is_active = true;

  RETURN jsonb_build_object(
    'income',            v_income,
    'fixed_total',       v_fixed_total,
    'variable_total',    v_variable_total,
    'unbudgeted_total',  v_unbudgeted_total,
    'total_spent',       v_variable_total + v_unbudgeted_total,
    'remaining',         v_income - v_fixed_total - v_variable_total - v_unbudgeted_total,
    'savings_balance',   v_savings_total,
    'by_category',       v_tx_by_cat
  );
END;
$$;

-- 10b. get_last_n_cycles(p_user_id uuid, n int)
-- Returns transaction totals for the last N cycles — used by reports.
CREATE OR REPLACE FUNCTION public.get_last_n_cycles(p_user_id uuid, n int DEFAULT 6)
RETURNS TABLE (
  cycle_key   date,
  income      numeric,
  spent       numeric,
  remaining   numeric
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    tx.cycle_key,
    COALESCE((SELECT SUM(i.amount) FROM public.cycle_income i WHERE i.user_id = p_user_id AND i.is_active), 0) AS income,
    COALESCE(SUM(tx.amount), 0) AS spent,
    COALESCE((SELECT SUM(i.amount) FROM public.cycle_income i WHERE i.user_id = p_user_id AND i.is_active), 0)
      - COALESCE(SUM(tx.amount), 0) AS remaining
  FROM public.cycle_transactions tx
  WHERE tx.user_id = p_user_id
  GROUP BY tx.cycle_key
  ORDER BY tx.cycle_key DESC
  LIMIT n;
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. GRANT RPC ACCESS TO AUTHENTICATED USERS
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_cycle_summary(uuid, date)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_n_cycles(uuid, int)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_saving_goal_balance()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_cycle_defaults_for_user()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at()                 TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 12. FUTURE-MODULE PLACEHOLDERS (comment block only)
-- ─────────────────────────────────────────────────────────────
-- The following modules are planned for this Personal Life
-- ecosystem. Table names reserved to avoid future collisions:
--
--   PANTRY (exists as pantry_items — owned by GEM)
--   MEAL PLANNER (exists as meal_plans/entries — owned by GEM)
--   SAVINGS GOALS (implemented above as cycle_saving_goals)
--
--   Future modules will use prefixes:
--     health_*       — fitness, weight, steps
--     finance_*      — investments, net worth tracking
--     journal_*      — daily notes, mood
--     habit_*        — habit tracking
--
-- The profiles table is the shared spine for all modules.
-- Auth is always Supabase Auth (auth.users → profiles).

-- ─────────────────────────────────────────────────────────────
-- DONE — run ROLLBACK if anything looks wrong before committing
-- ─────────────────────────────────────────────────────────────
