-- ============================================================================
-- v7: Claude assistant (bring your own Claude API key)
--
-- Each person can add their own Claude API key in Settings. The key is kept
-- encrypted in Supabase Vault; only the cycle-claude server function can
-- read it, when it calls Claude for that person. The app only ever sees the
-- last 4 characters.
--
--   1. cycle_ai_settings: one row per person (key hint, model, monthly limit)
--   2. cycle_ai_usage: one row per Claude call (tokens and cost), for the
--      monthly limit and the "used this month" figure
--   3. key functions for the server function only (store / read / remove)
--
-- People can read their own rows; all writes go through the server function
-- (service role), so nobody can point their row at someone else's key.
-- ============================================================================

-- 1. Settings ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cycle_ai_settings (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_secret_id     uuid,                -- vault.secrets id; useless without the server
  key_hint          text,                -- last 4 characters, shown in Settings
  model             text NOT NULL DEFAULT 'claude-opus-5-5'
                    CHECK (model IN ('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')),
  monthly_limit_zar numeric(10,2) CHECK (monthly_limit_zar IS NULL OR monthly_limit_zar > 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycle_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own AI settings" ON public.cycle_ai_settings
  FOR SELECT USING (auth.uid() = user_id AND public.has_app('cycle'));

CREATE TRIGGER set_updated_at_cycle_ai_settings
  BEFORE UPDATE ON public.cycle_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Usage -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cycle_ai_usage (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  kind               text NOT NULL CHECK (kind IN ('ask', 'statement', 'check')),
  model              text NOT NULL,
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  cache_read_tokens  integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  cost_usd           numeric(12,6) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS cycle_ai_usage_user_month ON public.cycle_ai_usage (user_id, created_at);
ALTER TABLE public.cycle_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own AI usage" ON public.cycle_ai_usage
  FOR SELECT USING (auth.uid() = user_id AND public.has_app('cycle'));

-- 3. Key functions: server function (service role) only ----------------------
CREATE OR REPLACE FUNCTION public.cycle_ai_store_key(p_user uuid, p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_id uuid;
BEGIN
  SELECT key_secret_id INTO v_id FROM public.cycle_ai_settings WHERE user_id = p_user;
  IF v_id IS NULL THEN
    v_id := vault.create_secret(p_key, 'cycle_ai_key_' || p_user::text, 'Claude API key for a Cycle user');
  ELSE
    PERFORM vault.update_secret(v_id, p_key);
  END IF;
  INSERT INTO public.cycle_ai_settings (user_id, key_secret_id, key_hint)
  VALUES (p_user, v_id, right(p_key, 4))
  ON CONFLICT (user_id) DO UPDATE SET key_secret_id = EXCLUDED.key_secret_id, key_hint = EXCLUDED.key_hint;
END;
$$;

CREATE OR REPLACE FUNCTION public.cycle_ai_read_key(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT d.decrypted_secret
    FROM public.cycle_ai_settings s
    JOIN vault.decrypted_secrets d ON d.id = s.key_secret_id
   WHERE s.user_id = p_user;
$$;

CREATE OR REPLACE FUNCTION public.cycle_ai_remove_key(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_id uuid;
BEGIN
  SELECT key_secret_id INTO v_id FROM public.cycle_ai_settings WHERE user_id = p_user;
  IF v_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = v_id; END IF;
  UPDATE public.cycle_ai_settings SET key_secret_id = NULL, key_hint = NULL WHERE user_id = p_user;
END;
$$;

REVOKE ALL ON FUNCTION public.cycle_ai_store_key(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cycle_ai_read_key(uuid)        FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cycle_ai_remove_key(uuid)      FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cycle_ai_store_key(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cycle_ai_read_key(uuid)        TO service_role;
GRANT EXECUTE ON FUNCTION public.cycle_ai_remove_key(uuid)      TO service_role;

-- A deleted account takes its vault secret with it
CREATE OR REPLACE FUNCTION public.cycle_ai_settings_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
BEGIN
  IF OLD.key_secret_id IS NOT NULL THEN DELETE FROM vault.secrets WHERE id = OLD.key_secret_id; END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cycle_ai_settings_cleanup() FROM public, anon, authenticated;
CREATE TRIGGER cycle_ai_settings_cleanup_trigger
  AFTER DELETE ON public.cycle_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.cycle_ai_settings_cleanup();

-- Statement imports read by Claude get their own format
ALTER TABLE public.cycle_import_batches DROP CONSTRAINT IF EXISTS cycle_import_batches_file_format_check;
ALTER TABLE public.cycle_import_batches ADD CONSTRAINT cycle_import_batches_file_format_check
  CHECK (file_format IN ('capitec_csv', 'capitec_pdf', 'gotyme_pdf', 'generic_csv', 'workbook', 'claude_pdf'));
