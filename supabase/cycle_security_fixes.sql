-- ============================================================
-- Security fixes for the shared Supabase project (Cycle + GEM Planner)
-- Clears the database-linter warnings:
--   0028/0029  SECURITY DEFINER functions executable by anon / authenticated
--   0011       functions with a mutable search_path
-- Nothing here changes data or table structure. Re-runnable.
-- ============================================================

-- 1. Report functions: run with the caller's rights so RLS applies.
--    As SECURITY DEFINER they returned any user's figures for any
--    p_user_id passed in. Neither app calls them today.
ALTER FUNCTION public.get_cycle_summary(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.get_cycle_summary(uuid, date) SET search_path = public;
ALTER FUNCTION public.get_last_n_cycles(uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_last_n_cycles(uuid, integer) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_cycle_summary(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_last_n_cycles(uuid, integer) FROM PUBLIC, anon;

-- 2. Trigger functions: they must keep SECURITY DEFINER (they write rows
--    for a user who is only just being created), but nobody should call
--    them through the API. Triggers do not need EXECUTE at fire time.
--      handle_new_user              auth.users → profiles (GEM Planner sign-up)
--      seed_cycle_defaults_for_user profiles → Cycle starter categories
--      rls_auto_enable              event trigger: turns RLS on for new tables
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.seed_cycle_defaults_for_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_cycle_defaults_for_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 3. Ordinary trigger helpers: pin the search_path.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_saving_goal_balance() SET search_path = public;

-- 4. Cycle v2 helpers (already SECURITY INVOKER): signed-in users only.
REVOKE EXECUTE ON FUNCTION public.cycle_key_for(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cycle_rekey_transactions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cycle_tx_fill_cycle_key() FROM PUBLIC, anon, authenticated;

-- Not covered here (dashboard setting): Auth → Passwords →
-- "Leaked password protection".
