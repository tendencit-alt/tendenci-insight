
-- 1) fin_forecasts: replace permissive open policies with tenant-scoped
DROP POLICY IF EXISTS "Authenticated users can view fin_forecasts" ON public.fin_forecasts;
DROP POLICY IF EXISTS "Authenticated users can insert fin_forecasts" ON public.fin_forecasts;
DROP POLICY IF EXISTS "Authenticated users can update fin_forecasts" ON public.fin_forecasts;

CREATE POLICY "fin_forecasts_tenant_select" ON public.fin_forecasts
  FOR SELECT TO authenticated USING (tenant_rls_check(tenant_id));
CREATE POLICY "fin_forecasts_tenant_insert" ON public.fin_forecasts
  FOR INSERT TO authenticated WITH CHECK (tenant_rls_check(tenant_id));
CREATE POLICY "fin_forecasts_tenant_update" ON public.fin_forecasts
  FOR UPDATE TO authenticated USING (tenant_rls_check(tenant_id)) WITH CHECK (tenant_rls_check(tenant_id));
-- DELETE admin-only policy already exists (admin_only_delete)

-- 2) fin_goal_alerts: same treatment
DROP POLICY IF EXISTS "Authenticated users can view fin_goal_alerts" ON public.fin_goal_alerts;
DROP POLICY IF EXISTS "Authenticated users can insert fin_goal_alerts" ON public.fin_goal_alerts;
DROP POLICY IF EXISTS "Authenticated users can update fin_goal_alerts" ON public.fin_goal_alerts;

CREATE POLICY "fin_goal_alerts_tenant_select" ON public.fin_goal_alerts
  FOR SELECT TO authenticated USING (tenant_rls_check(tenant_id));
CREATE POLICY "fin_goal_alerts_tenant_insert" ON public.fin_goal_alerts
  FOR INSERT TO authenticated WITH CHECK (tenant_rls_check(tenant_id));
CREATE POLICY "fin_goal_alerts_tenant_update" ON public.fin_goal_alerts
  FOR UPDATE TO authenticated USING (tenant_rls_check(tenant_id)) WITH CHECK (tenant_rls_check(tenant_id));

-- 3) master_ideas / attachments: drop hardcoded-email DELETE policies (admin policy already covers it)
DROP POLICY IF EXISTS "Emails autorizados podem deletar ideias" ON public.master_ideas;
DROP POLICY IF EXISTS "Emails autorizados podem deletar anexos" ON public.master_idea_attachments;

-- Ensure attachments has an admin delete policy (mirrors ideas)
DROP POLICY IF EXISTS "Admin pode deletar anexos" ON public.master_idea_attachments;
CREATE POLICY "Admin pode deletar anexos" ON public.master_idea_attachments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));

-- 4) production-attachments storage bucket: add UPDATE policy mirroring INSERT
DROP POLICY IF EXISTS "production_attachments_tenant_update" ON storage.objects;
CREATE POLICY "production_attachments_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'production-attachments'
    AND (is_owner() OR tenant_rls_check(storage_tenant_for(bucket_id, name)))
  )
  WITH CHECK (
    bucket_id = 'production-attachments'
    AND (is_owner() OR tenant_rls_check(storage_tenant_for(bucket_id, name)))
  );

-- 5) Revoke anon EXECUTE on internal SECURITY DEFINER helpers from recent migrations
REVOKE EXECUTE ON FUNCTION public._upsert_strategic_config(uuid, uuid, boolean, numeric, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_production_orders_on_status() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cascade_delete_order_projects() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clone_production_types_from_owner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_order_active_event_on_status() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mirror_owner_strategic_configs_to_tenant(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_bank_account(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_product_category(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_stock_location(uuid) FROM anon, PUBLIC;
