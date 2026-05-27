
-- audit_log: enforce tenant_id matches caller's tenant and user_id = auth.uid()
DROP POLICY IF EXISTS "restrict_audit_log_insert_tenant" ON public.audit_log;
CREATE POLICY "restrict_audit_log_insert_tenant" ON public.audit_log
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR (public.tenant_rls_check(tenant_id) AND (user_id IS NULL OR user_id = auth.uid()))
);

-- crm_deal_history: deal_id must belong to caller's tenant
DROP POLICY IF EXISTS "restrict_crm_deal_history_insert_tenant" ON public.crm_deal_history;
CREATE POLICY "restrict_crm_deal_history_insert_tenant" ON public.crm_deal_history
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_deal_history.deal_id AND public.tenant_rls_check(d.tenant_id)
  )
);

-- followup_logs: deal_id (when present) must belong to caller's tenant
DROP POLICY IF EXISTS "restrict_followup_logs_insert_tenant" ON public.followup_logs;
CREATE POLICY "restrict_followup_logs_insert_tenant" ON public.followup_logs
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR deal_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = followup_logs.deal_id AND public.tenant_rls_check(d.tenant_id)
  )
);
