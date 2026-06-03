-- Drop 8 triggers that write to system_activities
DROP TRIGGER IF EXISTS trigger_log_architect_history ON public.architect_history;
DROP TRIGGER IF EXISTS trigger_log_architect_timeline ON public.architect_timeline;
DROP TRIGGER IF EXISTS trigger_log_crm_deal_history ON public.crm_deal_history;
DROP TRIGGER IF EXISTS trigger_log_crm_tasks ON public.crm_tasks;
DROP TRIGGER IF EXISTS trigger_log_crm_timeline ON public.crm_timeline;
DROP TRIGGER IF EXISTS trigger_log_order_history ON public.order_history;
DROP TRIGGER IF EXISTS trigger_log_production ON public.production_logs;
DROP TRIGGER IF EXISTS trigger_log_prospec_agendamentos ON public.tendenci_prospec_arq_agendamentos;

-- Drop trigger functions (those whose body references system_activities)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND pg_get_functiondef(p.oid) ILIKE '%system_activities%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE;', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Remove from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.system_activities;

-- Drop the table
DROP TABLE IF EXISTS public.system_activities CASCADE;