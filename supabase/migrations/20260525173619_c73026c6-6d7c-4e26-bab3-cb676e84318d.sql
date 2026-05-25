
-- 1) Fix Function Search Path Mutable (hardening, no behavior change)
ALTER FUNCTION public._tenant_rls_audit_whitelist(text, text) SET search_path = public;
ALTER FUNCTION public.can_delete_master_idea() SET search_path = public;
ALTER FUNCTION public.create_order_commission_entries() SET search_path = public;
ALTER FUNCTION public.get_campaign_evolution(timestamp with time zone, timestamp with time zone, uuid) SET search_path = public;
ALTER FUNCTION public.get_campaign_metrics(timestamp with time zone, timestamp with time zone, uuid) SET search_path = public;
ALTER FUNCTION public.get_campaign_vendor_comparison(timestamp with time zone, timestamp with time zone, uuid) SET search_path = public;
ALTER FUNCTION public.get_ia_config() SET search_path = public;
ALTER FUNCTION public.get_prospeccao_architects_optimized(boolean, uuid, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.get_seller_goal_stats(uuid) SET search_path = public;
ALTER FUNCTION public.production_sla_alerts(uuid) SET search_path = public;
ALTER FUNCTION public.recalculate_budget_on_percent_change() SET search_path = public;
ALTER FUNCTION public.tg_incident_status_change() SET search_path = public;
ALTER FUNCTION public.tg_system_incidents_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- 2) RLS Enabled / No Policy — all 5 are self-healing system tables (owner-only)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'self_healing_escalations',
    'self_healing_guardrail_logs',
    'self_healing_policy_registry',
    'self_healing_retry_budgets',
    'self_healing_stability_checks'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Owner can manage %I" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "Owner can manage %1$I" ON public.%1$I AS PERMISSIVE FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner())$p$, t);
  END LOOP;
END $$;
