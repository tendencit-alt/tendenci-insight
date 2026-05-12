
-- ============ fin_ledger_splits ============
DROP POLICY IF EXISTS "Users can view all splits" ON public.fin_ledger_splits;
DROP POLICY IF EXISTS "Users can create splits" ON public.fin_ledger_splits;
DROP POLICY IF EXISTS "Users can update splits" ON public.fin_ledger_splits;
DROP POLICY IF EXISTS "Users can delete splits" ON public.fin_ledger_splits;

CREATE POLICY "Tenant users view splits"
ON public.fin_ledger_splits FOR SELECT TO authenticated
USING (
  is_owner() OR EXISTS (
    SELECT 1 FROM public.fin_ledger_entries e
    WHERE e.id = fin_ledger_splits.parent_entry_id
      AND tenant_rls_check(e.tenant_id)
  )
);

CREATE POLICY "Tenant users insert splits"
ON public.fin_ledger_splits FOR INSERT TO authenticated
WITH CHECK (
  is_owner() OR EXISTS (
    SELECT 1 FROM public.fin_ledger_entries e
    WHERE e.id = fin_ledger_splits.parent_entry_id
      AND tenant_rls_check(e.tenant_id)
  )
);

CREATE POLICY "Tenant users update splits"
ON public.fin_ledger_splits FOR UPDATE TO authenticated
USING (
  is_owner() OR EXISTS (
    SELECT 1 FROM public.fin_ledger_entries e
    WHERE e.id = fin_ledger_splits.parent_entry_id
      AND tenant_rls_check(e.tenant_id)
  )
);

CREATE POLICY "Tenant users delete splits"
ON public.fin_ledger_splits FOR DELETE TO authenticated
USING (
  is_owner() OR EXISTS (
    SELECT 1 FROM public.fin_ledger_entries e
    WHERE e.id = fin_ledger_splits.parent_entry_id
      AND tenant_rls_check(e.tenant_id)
  )
);

-- ============ rbac_critical_permissions ============
DROP POLICY IF EXISTS "Auth users can view rbac_critical_permissions" ON public.rbac_critical_permissions;
DROP POLICY IF EXISTS "Auth users can insert rbac_critical_permissions" ON public.rbac_critical_permissions;
DROP POLICY IF EXISTS "Auth users can update rbac_critical_permissions" ON public.rbac_critical_permissions;
DROP POLICY IF EXISTS "Auth users can delete rbac_critical_permissions" ON public.rbac_critical_permissions;

CREATE POLICY "Admins view critical permissions"
ON public.rbac_critical_permissions FOR SELECT TO authenticated
USING (is_owner() OR (is_admin() AND tenant_rls_check(tenant_id)));

CREATE POLICY "Admins manage critical permissions"
ON public.rbac_critical_permissions FOR ALL TO authenticated
USING (is_owner() OR (is_admin() AND tenant_rls_check(tenant_id)))
WITH CHECK (is_owner() OR (is_admin() AND tenant_rls_check(tenant_id)));

-- ============ rbac_segregation_rules ============
DROP POLICY IF EXISTS "Auth users can view rbac_segregation_rules" ON public.rbac_segregation_rules;
DROP POLICY IF EXISTS "Auth users can insert rbac_segregation_rules" ON public.rbac_segregation_rules;
DROP POLICY IF EXISTS "Auth users can update rbac_segregation_rules" ON public.rbac_segregation_rules;
DROP POLICY IF EXISTS "Auth users can delete rbac_segregation_rules" ON public.rbac_segregation_rules;

CREATE POLICY "Tenant view segregation rules"
ON public.rbac_segregation_rules FOR SELECT TO authenticated
USING (is_owner() OR tenant_rls_check(tenant_id));

CREATE POLICY "Admins manage segregation rules"
ON public.rbac_segregation_rules FOR ALL TO authenticated
USING (is_owner() OR (is_admin() AND tenant_rls_check(tenant_id)))
WITH CHECK (is_owner() OR (is_admin() AND tenant_rls_check(tenant_id)));

-- ============ fin_chart_accounts (delete policy) ============
DROP POLICY IF EXISTS "Authenticated users can delete fin_chart_accounts" ON public.fin_chart_accounts;

CREATE POLICY "Tenant users delete fin_chart_accounts"
ON public.fin_chart_accounts FOR DELETE TO authenticated
USING (is_owner() OR tenant_rls_check(tenant_id));

-- ============ ia_processing_failures ============
DROP POLICY IF EXISTS "Service role has full access to ia_processing_failures" ON public.ia_processing_failures;

CREATE POLICY "Owners/admins read ia_processing_failures"
ON public.ia_processing_failures FOR SELECT TO authenticated
USING (is_owner() OR is_admin());

CREATE POLICY "Service role manages ia_processing_failures"
ON public.ia_processing_failures FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============ dependency_impact_snapshots ============
DROP POLICY IF EXISTS "System manages snapshots" ON public.dependency_impact_snapshots;
DROP POLICY IF EXISTS "Owner/admin read snapshots" ON public.dependency_impact_snapshots;

CREATE POLICY "Owners/admins read dep snapshots"
ON public.dependency_impact_snapshots FOR SELECT TO authenticated
USING (is_owner() OR is_admin());

CREATE POLICY "Service role manages dep snapshots"
ON public.dependency_impact_snapshots FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============ integration_health_snapshots ============
DROP POLICY IF EXISTS "Service role manages snapshots" ON public.integration_health_snapshots;
DROP POLICY IF EXISTS "Owner reads snapshots" ON public.integration_health_snapshots;

CREATE POLICY "Owners/admins read integration snapshots"
ON public.integration_health_snapshots FOR SELECT TO authenticated
USING (is_owner() OR is_admin());

CREATE POLICY "Service role manages integration snapshots"
ON public.integration_health_snapshots FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============ audit_log ============
DROP POLICY IF EXISTS "Auth users can view audit_log" ON public.audit_log;

CREATE POLICY "Tenant users view audit_log"
ON public.audit_log FOR SELECT TO authenticated
USING (is_owner() OR tenant_rls_check(tenant_id));

-- ============ fin_audit_logs ============
DROP POLICY IF EXISTS "Authenticated users can view fin_audit_logs" ON public.fin_audit_logs;

CREATE POLICY "Owners/admins view fin_audit_logs"
ON public.fin_audit_logs FOR SELECT TO authenticated
USING (is_owner() OR is_admin() OR user_id = auth.uid());

-- ============ users ============
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.users;

CREATE POLICY "Owners/admins view users"
ON public.users FOR SELECT TO authenticated
USING (is_owner() OR is_admin() OR id = auth.uid());

-- ============ temp_phone_fixes ============
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs de correção de telefone" ON public.temp_phone_fixes;

CREATE POLICY "Owners/admins view temp_phone_fixes"
ON public.temp_phone_fixes FOR SELECT TO authenticated
USING (is_owner() OR is_admin());

-- ============ tendenci_campaign_dispatches ============
DROP POLICY IF EXISTS "Sistema atualiza dispatches" ON public.tendenci_campaign_dispatches;

CREATE POLICY "Users update own dispatches"
ON public.tendenci_campaign_dispatches FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR is_owner()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
