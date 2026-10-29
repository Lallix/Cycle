-- ============================================================================
-- v6: per-app access (Cycle, GEM Planner) on the shared Supabase project
--
-- Cycle and GEM Planner share one login. Until now any account could use
-- both apps. This adds an access list and makes every app table check it,
-- so a person only gets into the apps they were given.
--
--   1. app_access table: one row per (user, app)
--   2. helpers: is_admin(), has_app(app)  (a disabled profile has no access)
--   3. profiles: a user can no longer make themselves admin or re-enable
--      themselves (until now "Own profile update" allowed it)
--   4. every cycle_* policy also requires has_app('cycle'),
--      every GEM policy also requires has_app('gem')
--   5. Cycle's starter categories are created when someone is given Cycle,
--      not for every new login
--   6. existing users get the access listed at the bottom
--
-- Policies are changed with ALTER POLICY, so names and the "own rows only"
-- rule stay as they are; only the app check is added.
-- ============================================================================

-- 1. Access list -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_access (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app        text NOT NULL CHECK (app IN ('cycle', 'gem')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, app)
);
ALTER TABLE public.app_access ENABLE ROW LEVEL SECURITY;

-- 2. Helpers (SECURITY DEFINER so policies can call them without recursion) --
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
                  WHERE id = auth.uid() AND is_admin AND NOT coalesce(is_disabled, false));
$$;

CREATE OR REPLACE FUNCTION public.has_app(p_app text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_access a
                   JOIN public.profiles p ON p.id = a.user_id
                  WHERE a.user_id = auth.uid() AND a.app = p_app
                    AND NOT coalesce(p.is_disabled, false));
$$;

REVOKE ALL ON FUNCTION public.is_admin()      FROM public, anon;
REVOKE ALL ON FUNCTION public.has_app(text)   FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app(text) TO authenticated;

-- People see their own access (so an app can say "no access"); admins see and manage all
CREATE POLICY "Read own app access" ON public.app_access
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage app access" ON public.app_access
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Profiles: admin and disabled flags only change through an admin -------
-- Direct database work (SQL editor, server functions) has no auth.uid() and
-- is let through.
CREATE OR REPLACE FUNCTION public.profiles_protect_flags()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_disabled := false;
  ELSIF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_disabled IS DISTINCT FROM OLD.is_disabled THEN
    RAISE EXCEPTION 'Only an admin can change admin or disabled status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_flags_trigger ON public.profiles;
CREATE TRIGGER profiles_protect_flags_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_flags();

-- 4a. Cycle tables -----------------------------------------------------------
ALTER POLICY "Users own their account balances"   ON public.cycle_account_balances    USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their accounts"           ON public.cycle_accounts            USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their categories"         ON public.cycle_categories          USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their budget history"     ON public.cycle_category_budgets    USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "own fixed paid"                     ON public.cycle_fixed_paid          USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their import batches"     ON public.cycle_import_batches      USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their income"             ON public.cycle_income              USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their paydays"            ON public.cycle_paydays             USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their payee rules"        ON public.cycle_payee_rules         USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their planned items"      ON public.cycle_planned_items       USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their recurring expenses" ON public.cycle_recurring_expenses  USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their paid log"           ON public.cycle_recurring_paid_log  USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their saving goals"       ON public.cycle_saving_goals        USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their saving transactions" ON public.cycle_saving_transactions USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));
ALTER POLICY "Users own their transactions"       ON public.cycle_transactions        USING (auth.uid() = user_id AND public.has_app('cycle')) WITH CHECK (auth.uid() = user_id AND public.has_app('cycle'));

-- 4b. GEM Planner tables (their policies have no WITH CHECK, so USING covers writes too)
ALTER POLICY "Own budgets"              ON public.budgets             USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Delete own grocery items" ON public.grocery_items       USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Manage own grocery items" ON public.grocery_items       WITH CHECK (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Read grocery items"       ON public.grocery_items       USING (((auth.uid() = user_id) OR (is_shared = true)) AND public.has_app('gem'));
ALTER POLICY "Update own grocery items" ON public.grocery_items       USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own plan entries"         ON public.meal_plan_entries   USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own meal plans"           ON public.meal_plans          USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own pantry"               ON public.pantry_items        USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own price history"        ON public.price_history       USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own receipt items"        ON public.receipt_items       USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own receipts"             ON public.receipts            USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own recipes"              ON public.recipes             USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own shopping list"        ON public.shopping_list_items USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Own stores"               ON public.stores              USING (auth.uid() = user_id AND public.has_app('gem'));
ALTER POLICY "Manage own recipe shares" ON public.recipe_shares       USING (auth.uid() = shared_by AND public.has_app('gem'));
ALTER POLICY "See shares for me"        ON public.recipe_shares       USING (auth.uid() = shared_with AND public.has_app('gem'));
ALTER POLICY "See shared recipes"       ON public.recipes             USING (((visibility = 'everyone') OR ((visibility = 'shared') AND EXISTS (
    SELECT 1 FROM public.recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())))
  AND public.has_app('gem'));
ALTER POLICY "Own recipe ingredients"   ON public.recipe_ingredients  USING (EXISTS (
    SELECT 1 FROM public.recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid())
  AND public.has_app('gem'));
ALTER POLICY "See shared recipe ingredients" ON public.recipe_ingredients USING (EXISTS (
    SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND ((r.visibility = 'everyone') OR ((r.visibility = 'shared') AND EXISTS (
      SELECT 1 FROM public.recipe_shares WHERE recipe_shares.recipe_id = r.id AND recipe_shares.shared_with = auth.uid()))))
  AND public.has_app('gem'));

-- 5. Cycle starter data: when Cycle access is given, not on every new login --
DROP TRIGGER IF EXISTS seed_cycle_defaults_trigger ON public.profiles;

CREATE OR REPLACE FUNCTION public.seed_cycle_defaults_on_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only for someone with no Cycle categories yet (never touches existing data)
  IF NEW.app = 'cycle' AND NOT EXISTS (SELECT 1 FROM public.cycle_categories WHERE user_id = NEW.user_id) THEN
    PERFORM public.seed_cycle_defaults_for(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- The old trigger function, reshaped to take a user id
CREATE OR REPLACE FUNCTION public.seed_cycle_defaults_for(v_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cycle_categories (user_id, name, type, icon, budget_amount, sort_order)
  VALUES
    (v_uid,'Groceries','variable','🛒',650.00,1),
    (v_uid,'Petrol','variable','⛽',800.00,2),
    (v_uid,'Eating Out','variable','🍽️',500.00,3),
    (v_uid,'Transport','variable','🚌',150.00,4),
    (v_uid,'Entertainment','variable','🎬',200.00,5),
    (v_uid,'Clothing','variable','👕',300.00,6),
    (v_uid,'Kids / School','variable','🎒',100.00,7),
    (v_uid,'Medical','variable','💊',200.00,8),
    (v_uid,'Unbudgeted','unbudgeted','❓',NULL,99)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO public.cycle_accounts (user_id, name, bank, is_default, sort_order)
  VALUES (v_uid, 'Capitec', 'Capitec', true, 0)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_cycle_defaults_for(uuid) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.seed_cycle_defaults_on_access() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS seed_cycle_defaults_on_access_trigger ON public.app_access;
CREATE TRIGGER seed_cycle_defaults_on_access_trigger
  AFTER INSERT ON public.app_access
  FOR EACH ROW EXECUTE FUNCTION public.seed_cycle_defaults_on_access();

-- 6. Existing users ----------------------------------------------------------
INSERT INTO public.app_access (user_id, app)
SELECT p.id, a.app
  FROM public.profiles p
  JOIN (VALUES
    ('gideon.visagie86@gmail.com',  'cycle'),
    ('gideon.visagie86@gmail.com',  'gem'),
    ('chanelle.visagie86@gmail.com','gem'),
    ('natasha.hunter1@yahoo.com',   'gem')
  ) AS a(email, app) ON a.email = p.email
ON CONFLICT DO NOTHING;
