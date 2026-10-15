-- ============================================================
-- CYCLE BUDGET MODULE — Migration v3: budget history
-- ============================================================
-- A category's monthly limit can change over time. Each row says
-- "from the cycle starting effective_from, this category's limit is
-- amount". The plan for any cycle is the latest row on or before its
-- start; with no row, cycle_categories.budget_amount is used.
-- This lets the payday review judge each past cycle against the plan
-- that was in force then, not today's numbers.
-- Additive only. Re-runnable.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cycle_category_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES public.cycle_categories(id) ON DELETE CASCADE,
  effective_from  date NOT NULL,                       -- a cycle start (payday)
  amount          numeric(12,2) NOT NULL CHECK (amount >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, effective_from)
);

ALTER TABLE public.cycle_category_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their budget history" ON public.cycle_category_budgets;
CREATE POLICY "Users own their budget history"
  ON public.cycle_category_budgets FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cycle_category_budgets_user_idx
  ON public.cycle_category_budgets(user_id, effective_from);

-- Starting point: every category's current limit applies from the
-- user's first payday (or the start of their first cycle of transactions).
INSERT INTO public.cycle_category_budgets (user_id, category_id, effective_from, amount)
SELECT c.user_id, c.id,
       COALESCE((SELECT min(pay_date) FROM public.cycle_paydays p WHERE p.user_id = c.user_id),
                (SELECT min(cycle_key) FROM public.cycle_transactions t WHERE t.user_id = c.user_id),
                CURRENT_DATE),
       c.budget_amount
FROM public.cycle_categories c
WHERE c.budget_amount IS NOT NULL AND c.is_active
ON CONFLICT (category_id, effective_from) DO NOTHING;
