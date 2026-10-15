-- ============================================================
-- CYCLE BUDGET MODULE — Migration v2: statement import & spend types
-- Project: mjaschvxhdupoemaezjt (shared with GEM Planner)
-- ============================================================
-- SAFE TO RUN: additive only, and only on cycle_* tables.
--   • No GEM Planner table is touched (profiles, receipts, grocery_* …).
--   • Existing rows keep working: new columns have defaults, and the
--     legacy category types ('variable', 'unbudgeted') stay valid until
--     the app is moved to the new types (see section 10, run later).
--   • Re-runnable: IF NOT EXISTS / DROP … IF EXISTS throughout.
--
-- What it adds
--   1. cycle_accounts      kind (bank / credit card / loan …), account number
--   2. cycle_categories    new spend types: income, fixed, predicted,
--                          unplanned, once_off, debt, transfer
--   3. cycle_transactions  direction (in/out), bank description, balance,
--                          account link, import source + duplicate guard
--   4. cycle_import_batches     one row per statement file imported
--   5. cycle_payee_rules        description pattern → category
--   6. cycle_paydays            real pay dates; a cycle runs payday→payday
--   7. cycle_account_balances   balance snapshots (statement or typed in)
--   8. cycle_planned_items      expected once-offs (tax rebate, bond arrears)
--   + cycle_key_for() and a trigger that fills cycle_key from paydays
--   + cycle_transactions_v view with a signed amount and category type
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CYCLE_ACCOUNTS — what kind of account, and its number
-- account_number lets the CSV import recognise the account
-- (Capitec puts it in the 'Account' column of every row).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.cycle_accounts
  ADD COLUMN IF NOT EXISTS kind            text NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS account_number  text,
  ADD COLUMN IF NOT EXISTS is_active       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.cycle_accounts DROP CONSTRAINT IF EXISTS cycle_accounts_kind_check;
ALTER TABLE public.cycle_accounts
  ADD CONSTRAINT cycle_accounts_kind_check
  CHECK (kind IN ('bank', 'savings', 'credit_card', 'loan', 'home_loan', 'cash'));

CREATE UNIQUE INDEX IF NOT EXISTS cycle_accounts_user_number_key
  ON public.cycle_accounts(user_id, account_number)
  WHERE account_number IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. CYCLE_CATEGORIES — spend types
--   income     regular money earned (salary, fuel claims)
--   fixed      same every month (bond, levy, school fees, insurance)
--   predicted  every month, amount moves (groceries, electricity, fuel)
--   unplanned  irregular (repairs, gifts, electronics)
--   once_off   big once-off in or out (tax rebate, buying a car)
--   debt       loans in / lump-sum repayments
--   transfer   between own accounts — excluded from all totals
-- 'variable' and 'unbudgeted' are kept so the current app keeps working.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.cycle_categories DROP CONSTRAINT IF EXISTS cycle_categories_type_check;
ALTER TABLE public.cycle_categories
  ADD CONSTRAINT cycle_categories_type_check
  CHECK (type IN ('income', 'fixed', 'predicted', 'unplanned', 'once_off', 'debt', 'transfer',
                  'variable', 'unbudgeted'));   -- legacy, mapped in section 9

ALTER TABLE public.cycle_categories
  ADD COLUMN IF NOT EXISTS description text;

-- ─────────────────────────────────────────────────────────────
-- 3. CYCLE_TRANSACTIONS — money in as well as out, and imports
-- amount stays positive (existing check); direction says which way.
-- Existing rows are all expenses, so the default 'out' is correct.
-- import_hash is built by the app from account + date + amount +
-- description + balance; the unique index stops double imports.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_import_batches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       uuid REFERENCES public.cycle_accounts(id) ON DELETE SET NULL,
  file_name        text,
  file_format      text NOT NULL DEFAULT 'capitec_csv'
                     CHECK (file_format IN ('capitec_csv', 'gotyme_pdf', 'generic_csv', 'workbook')),
  statement_from   date,
  statement_to     date,
  row_count        integer NOT NULL DEFAULT 0,
  inserted_count   integer NOT NULL DEFAULT 0,
  duplicate_count  integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their import batches" ON public.cycle_import_batches;
CREATE POLICY "Users own their import batches"
  ON public.cycle_import_batches FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS cycle_import_batches_user_idx
  ON public.cycle_import_batches(user_id, created_at DESC);

ALTER TABLE public.cycle_transactions
  ADD COLUMN IF NOT EXISTS direction        text NOT NULL DEFAULT 'out',
  ADD COLUMN IF NOT EXISTS description      text,            -- bank's description
  ADD COLUMN IF NOT EXISTS bank_category    text,            -- bank's own category, kept for reference
  ADD COLUMN IF NOT EXISTS balance          numeric(12,2),   -- running balance after this line
  ADD COLUMN IF NOT EXISTS account_id       uuid REFERENCES public.cycle_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source           text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS import_hash      text,
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES public.cycle_import_batches(id) ON DELETE SET NULL;

ALTER TABLE public.cycle_transactions DROP CONSTRAINT IF EXISTS cycle_transactions_direction_check;
ALTER TABLE public.cycle_transactions
  ADD CONSTRAINT cycle_transactions_direction_check CHECK (direction IN ('in', 'out'));
ALTER TABLE public.cycle_transactions DROP CONSTRAINT IF EXISTS cycle_transactions_source_check;
ALTER TABLE public.cycle_transactions
  ADD CONSTRAINT cycle_transactions_source_check CHECK (source IN ('manual', 'import'));

CREATE UNIQUE INDEX IF NOT EXISTS cycle_tx_user_import_hash_key
  ON public.cycle_transactions(user_id, import_hash)
  WHERE import_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS cycle_tx_account_idx
  ON public.cycle_transactions(user_id, account_id, transaction_date);
CREATE INDEX IF NOT EXISTS cycle_tx_batch_idx
  ON public.cycle_transactions(import_batch_id);

-- ─────────────────────────────────────────────────────────────
-- 4. CYCLE_PAYEE_RULES — auto-categorise imported lines
-- pattern is a case-insensitive regex matched against description.
-- Lowest priority number wins. account_id NULL = any account.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_payee_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern      text NOT NULL,
  category_id  uuid NOT NULL REFERENCES public.cycle_categories(id) ON DELETE CASCADE,
  account_id   uuid REFERENCES public.cycle_accounts(id) ON DELETE CASCADE,
  priority     smallint NOT NULL DEFAULT 100,
  is_active    boolean NOT NULL DEFAULT true,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_payee_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their payee rules" ON public.cycle_payee_rules;
CREATE POLICY "Users own their payee rules"
  ON public.cycle_payee_rules FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS cycle_payee_rules_user_idx
  ON public.cycle_payee_rules(user_id, priority);

-- ─────────────────────────────────────────────────────────────
-- 5. CYCLE_PAYDAYS — a cycle runs from one payday to the day before
-- the next. cycle_key = the pay date. is_expected = not paid yet.
-- Without paydays, cycle_start_day on profiles is used as before.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_paydays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pay_date     date NOT NULL,
  is_expected  boolean NOT NULL DEFAULT false,
  amount       numeric(12,2) CHECK (amount >= 0),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pay_date)
);

ALTER TABLE public.cycle_paydays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their paydays" ON public.cycle_paydays;
CREATE POLICY "Users own their paydays"
  ON public.cycle_paydays FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 6. CYCLE_ACCOUNT_BALANCES — balance snapshots per account.
-- Imports write statement balances; loan and bond balances are
-- typed in from the bank app. Feeds the net-position trend.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_account_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.cycle_accounts(id) ON DELETE CASCADE,
  as_at       date NOT NULL,
  balance     numeric(12,2) NOT NULL,          -- negative = owed
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'statement')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, as_at)
);

ALTER TABLE public.cycle_account_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their account balances" ON public.cycle_account_balances;
CREATE POLICY "Users own their account balances"
  ON public.cycle_account_balances FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS cycle_account_balances_user_idx
  ON public.cycle_account_balances(user_id, as_at);

-- ─────────────────────────────────────────────────────────────
-- 7. CYCLE_PLANNED_ITEMS — expected once-offs for planning
-- e.g. +R72,000 tax rebate, -R27,750 bond arrears, -R15,000 loan.
-- matched_transaction_id is set when the real transaction arrives.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_planned_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  amount                  numeric(12,2) NOT NULL CHECK (amount > 0),
  direction               text NOT NULL DEFAULT 'out' CHECK (direction IN ('in', 'out')),
  expected_date           date,
  category_id             uuid REFERENCES public.cycle_categories(id) ON DELETE SET NULL,
  account_id              uuid REFERENCES public.cycle_accounts(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'cancelled')),
  matched_transaction_id  uuid REFERENCES public.cycle_transactions(id) ON DELETE SET NULL,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_planned_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their planned items" ON public.cycle_planned_items;
CREATE POLICY "Users own their planned items"
  ON public.cycle_planned_items FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS cycle_planned_items_user_idx
  ON public.cycle_planned_items(user_id, expected_date);

-- updated_at triggers for the new tables + cycle_accounts
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['cycle_accounts', 'cycle_payee_rules', 'cycle_planned_items'] LOOP
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

-- ─────────────────────────────────────────────────────────────
-- 8. CYCLE KEYS FROM PAYDAYS
-- cycle_key_for(): latest payday on or before the date; with no
-- payday on record, falls back to profiles.cycle_start_day (the
-- same rule as getCurrentCycle in src/lib/cycle.js).
-- The trigger fills cycle_key when the app leaves it NULL (imports);
-- the current app keeps sending its own cycle_key and is unaffected.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cycle_key_for(p_user_id uuid, p_date date)
RETURNS date LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT max(pay_date) FROM public.cycle_paydays
      WHERE user_id = p_user_id AND pay_date <= p_date),
    (SELECT CASE
              WHEN extract(day FROM p_date) >= sd
                THEN make_date(extract(year FROM p_date)::int, extract(month FROM p_date)::int, sd)
              ELSE (make_date(extract(year FROM p_date)::int, extract(month FROM p_date)::int, sd)
                    - interval '1 month')::date
            END
       FROM (SELECT COALESCE(cycle_start_day, 25)::int AS sd
               FROM public.profiles WHERE id = p_user_id) p)
  );
$$;

CREATE OR REPLACE FUNCTION public.cycle_tx_fill_cycle_key()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.cycle_key IS NULL THEN
    NEW.cycle_key := public.cycle_key_for(NEW.user_id, NEW.transaction_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cycle_tx_fill_cycle_key_trigger ON public.cycle_transactions;
CREATE TRIGGER cycle_tx_fill_cycle_key_trigger
  BEFORE INSERT OR UPDATE OF transaction_date, cycle_key ON public.cycle_transactions
  FOR EACH ROW EXECUTE FUNCTION public.cycle_tx_fill_cycle_key();

-- Re-key a user's transactions after paydays are added or changed.
CREATE OR REPLACE FUNCTION public.cycle_rekey_transactions(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.cycle_transactions t
     SET cycle_key = public.cycle_key_for(t.user_id, t.transaction_date)
   WHERE t.user_id = p_user_id
     AND t.cycle_key IS DISTINCT FROM public.cycle_key_for(t.user_id, t.transaction_date);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. REPORTING VIEW — signed amount (+ in, - out) and the type
-- security_invoker: the caller's RLS applies, so each user only
-- ever sees their own rows.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.cycle_transactions_v
WITH (security_invoker = true) AS
SELECT
  t.*,
  CASE WHEN t.direction = 'in' THEN t.amount ELSE -t.amount END AS signed_amount,
  date_trunc('month', t.transaction_date)::date                 AS month,
  c.name                                                        AS category_name,
  CASE c.type WHEN 'variable'   THEN 'predicted'
              WHEN 'unbudgeted' THEN 'unplanned'
              ELSE COALESCE(c.type, 'unplanned') END            AS spend_type,
  a.name                                                        AS account_name,
  a.kind                                                        AS account_kind
FROM public.cycle_transactions t
LEFT JOIN public.cycle_categories c ON c.id = t.category_id
LEFT JOIN public.cycle_accounts   a ON a.id = t.account_id;

-- ─────────────────────────────────────────────────────────────
-- 10. LATER (run with the app update in phase 4, not now):
-- move legacy types to the new ones once the app reads them.
-- ─────────────────────────────────────────────────────────────
-- UPDATE public.cycle_categories SET type = 'predicted' WHERE type = 'variable';
-- UPDATE public.cycle_categories SET type = 'unplanned' WHERE type = 'unbudgeted';
