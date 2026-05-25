
-- 1) ad_spend: no tenant column. Restrict reads to owner only.
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.ad_spend;
CREATE POLICY "Owners can view ad_spend"
  ON public.ad_spend FOR SELECT TO authenticated
  USING (public.is_owner());

-- 2) audit_import_logs: tenant scoped
DROP POLICY IF EXISTS "Auth users can view audit_import_logs" ON public.audit_import_logs;
CREATE POLICY "Tenant members view audit_import_logs"
  ON public.audit_import_logs FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
DROP POLICY IF EXISTS "Auth users can insert audit_import_logs" ON public.audit_import_logs;
CREATE POLICY "Tenant members insert audit_import_logs"
  ON public.audit_import_logs FOR INSERT TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

-- 3) dispatch_session_items: join via dispatch_sessions.tenant_id
DROP POLICY IF EXISTS "Authenticated users can view dispatch items" ON public.dispatch_session_items;
CREATE POLICY "Tenant members view dispatch items"
  ON public.dispatch_session_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatch_sessions ds
      WHERE ds.id = dispatch_session_items.session_id
        AND public.tenant_rls_check(ds.tenant_id)
    )
  );

-- 4) fin_automation_logs: tenant scoped
DROP POLICY IF EXISTS "Authenticated users can view fin_automation_logs" ON public.fin_automation_logs;
DROP POLICY IF EXISTS "Authenticated users can insert fin_automation_logs" ON public.fin_automation_logs;
CREATE POLICY "Tenant members view fin_automation_logs"
  ON public.fin_automation_logs FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));
CREATE POLICY "Tenant members insert fin_automation_logs"
  ON public.fin_automation_logs FOR INSERT TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

-- 5) fin_reconciliation_links: join via fin_bank_transactions
DROP POLICY IF EXISTS "Authenticated users can view fin_reconciliation_links" ON public.fin_reconciliation_links;
DROP POLICY IF EXISTS "Authenticated users can insert fin_reconciliation_links" ON public.fin_reconciliation_links;
DROP POLICY IF EXISTS "Authenticated users can update fin_reconciliation_links" ON public.fin_reconciliation_links;
DROP POLICY IF EXISTS "Authenticated users can delete fin_reconciliation_links" ON public.fin_reconciliation_links;

CREATE POLICY "Tenant members view fin_reconciliation_links"
  ON public.fin_reconciliation_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fin_bank_transactions bt
      WHERE bt.id = fin_reconciliation_links.bank_transaction_id
        AND public.tenant_rls_check(bt.tenant_id)
    )
  );
CREATE POLICY "Tenant members insert fin_reconciliation_links"
  ON public.fin_reconciliation_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fin_bank_transactions bt
      WHERE bt.id = fin_reconciliation_links.bank_transaction_id
        AND public.tenant_rls_check(bt.tenant_id)
    )
  );
CREATE POLICY "Tenant members update fin_reconciliation_links"
  ON public.fin_reconciliation_links FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fin_bank_transactions bt
      WHERE bt.id = fin_reconciliation_links.bank_transaction_id
        AND public.tenant_rls_check(bt.tenant_id)
    )
  );
CREATE POLICY "Tenant members delete fin_reconciliation_links"
  ON public.fin_reconciliation_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fin_bank_transactions bt
      WHERE bt.id = fin_reconciliation_links.bank_transaction_id
        AND public.tenant_rls_check(bt.tenant_id)
    )
  );

-- 6) followup_logs: join via crm_deals.tenant_id
DROP POLICY IF EXISTS "Autenticados leem followup_logs" ON public.followup_logs;
CREATE POLICY "Tenant members view followup_logs"
  ON public.followup_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_deals d
      WHERE d.id = followup_logs.deal_id
        AND public.tenant_rls_check(d.tenant_id)
    )
  );

-- 7) ia_pending_messages: no tenant column; restrict to owner only
DROP POLICY IF EXISTS "Authenticated users can manage pending messages" ON public.ia_pending_messages;
CREATE POLICY "Owners manage ia_pending_messages"
  ON public.ia_pending_messages FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- 8) msg_costs: no tenant column; restrict to owner only
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.msg_costs;
CREATE POLICY "Owners view msg_costs"
  ON public.msg_costs FOR SELECT TO authenticated
  USING (public.is_owner());

-- 9) tendenci_whatsapp_connections: revoke credential columns from authenticated
REVOKE SELECT (evolution_apikey, evolution_url) ON public.tendenci_whatsapp_connections FROM authenticated, anon;
