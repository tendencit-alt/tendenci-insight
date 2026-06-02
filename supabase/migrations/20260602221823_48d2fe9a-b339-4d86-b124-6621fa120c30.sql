
DROP TABLE IF EXISTS public._e2e_final;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='rate_limit_signup') THEN
    EXECUTE 'REVOKE ALL ON public.rate_limit_signup FROM anon, authenticated';
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='rate_limit_signup_deny_all'
                   AND polrelid='public.rate_limit_signup'::regclass) THEN
      EXECUTE $p$CREATE POLICY rate_limit_signup_deny_all ON public.rate_limit_signup
               AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)$p$;
    END IF;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.move_production_phase(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_regress_production_phase(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reprogram_op(uuid, timestamp with time zone, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_production_phase_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.lock_production_due_date() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_phase_templates_for_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_production_status_columns() FROM anon;
