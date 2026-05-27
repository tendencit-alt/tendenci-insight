
-- CRM
DROP POLICY IF EXISTS crm_activities_tenant_restrict ON public.crm_activities;
CREATE POLICY crm_activities_tenant_restrict ON public.crm_activities AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_activities.deal_id AND public.tenant_rls_check(d.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_activities.deal_id AND public.tenant_rls_check(d.tenant_id)));

DROP POLICY IF EXISTS crm_timeline_tenant_restrict ON public.crm_timeline;
CREATE POLICY crm_timeline_tenant_restrict ON public.crm_timeline AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_timeline.deal_id AND public.tenant_rls_check(d.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_timeline.deal_id AND public.tenant_rls_check(d.tenant_id)));

DROP POLICY IF EXISTS crm_timeline_attachments_tenant_restrict ON public.crm_timeline_attachments;
CREATE POLICY crm_timeline_attachments_tenant_restrict ON public.crm_timeline_attachments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.crm_timeline t JOIN public.crm_deals d ON d.id = t.deal_id
    WHERE t.id = crm_timeline_attachments.timeline_id AND public.tenant_rls_check(d.tenant_id)
  ))
  WITH CHECK (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.crm_timeline t JOIN public.crm_deals d ON d.id = t.deal_id
    WHERE t.id = crm_timeline_attachments.timeline_id AND public.tenant_rls_check(d.tenant_id)
  ));

DROP POLICY IF EXISTS crm_deal_files_tenant_restrict ON public.crm_deal_files;
CREATE POLICY crm_deal_files_tenant_restrict ON public.crm_deal_files AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_deal_files.deal_id AND public.tenant_rls_check(d.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.crm_deals d WHERE d.id = crm_deal_files.deal_id AND public.tenant_rls_check(d.tenant_id)));

-- Projects
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_notes','project_files','project_history','project_quotes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_restrict', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = %I.project_id AND public.tenant_rls_check(pr.tenant_id)))
      WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = %I.project_id AND public.tenant_rls_check(pr.tenant_id)))$p$, t||'_tenant_restrict', t, t, t);
  END LOOP;
END $$;

-- Architects
DROP POLICY IF EXISTS architect_files_tenant_restrict ON public.architect_files;
CREATE POLICY architect_files_tenant_restrict ON public.architect_files AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = architect_files.architect_id AND public.tenant_rls_check(a.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = architect_files.architect_id AND public.tenant_rls_check(a.tenant_id)));

DROP POLICY IF EXISTS architect_timeline_tenant_restrict ON public.architect_timeline;
CREATE POLICY architect_timeline_tenant_restrict ON public.architect_timeline AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = architect_timeline.architect_id AND public.tenant_rls_check(a.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = architect_timeline.architect_id AND public.tenant_rls_check(a.tenant_id)));

DROP POLICY IF EXISTS architect_timeline_attachments_tenant_restrict ON public.architect_timeline_attachments;
CREATE POLICY architect_timeline_attachments_tenant_restrict ON public.architect_timeline_attachments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.architect_timeline t JOIN public.architects a ON a.id = t.architect_id
    WHERE t.id = architect_timeline_attachments.timeline_id AND public.tenant_rls_check(a.tenant_id)
  ))
  WITH CHECK (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.architect_timeline t JOIN public.architects a ON a.id = t.architect_id
    WHERE t.id = architect_timeline_attachments.timeline_id AND public.tenant_rls_check(a.tenant_id)
  ));

DROP POLICY IF EXISTS tendenci_prospec_arq_logs_tenant_restrict ON public.tendenci_prospec_arq_logs;
CREATE POLICY tendenci_prospec_arq_logs_tenant_restrict ON public.tendenci_prospec_arq_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = tendenci_prospec_arq_logs.architect_id AND public.tenant_rls_check(a.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.architects a WHERE a.id = tendenci_prospec_arq_logs.architect_id AND public.tenant_rls_check(a.tenant_id)));

-- Production / Purchases
DROP POLICY IF EXISTS production_automation_logs_tenant_restrict ON public.production_automation_logs;
CREATE POLICY production_automation_logs_tenant_restrict ON public.production_automation_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_automation_logs.production_order_id AND public.tenant_rls_check(po.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_automation_logs.production_order_id AND public.tenant_rls_check(po.tenant_id)));

DROP POLICY IF EXISTS production_product_bom_tenant_restrict ON public.production_product_bom;
CREATE POLICY production_product_bom_tenant_restrict ON public.production_product_bom AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.production_products pp JOIN public.production_orders po ON po.id = pp.production_order_id
    WHERE pp.id = production_product_bom.production_product_id AND public.tenant_rls_check(po.tenant_id)
  ))
  WITH CHECK (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.production_products pp JOIN public.production_orders po ON po.id = pp.production_order_id
    WHERE pp.id = production_product_bom.production_product_id AND public.tenant_rls_check(po.tenant_id)
  ));

DROP POLICY IF EXISTS purchase_order_items_tenant_restrict ON public.purchase_order_items;
CREATE POLICY purchase_order_items_tenant_restrict ON public.purchase_order_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND public.tenant_rls_check(po.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND public.tenant_rls_check(po.tenant_id)));

-- profile_type_permissions (has tenant_id directly)
DROP POLICY IF EXISTS profile_type_permissions_tenant_restrict ON public.profile_type_permissions;
CREATE POLICY profile_type_permissions_tenant_restrict ON public.profile_type_permissions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

-- tendenci_ia_produtos_estoque (parent: tendenci_ia_produtos)
DROP POLICY IF EXISTS tendenci_ia_produtos_estoque_tenant_restrict ON public.tendenci_ia_produtos_estoque;
CREATE POLICY tendenci_ia_produtos_estoque_tenant_restrict ON public.tendenci_ia_produtos_estoque AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.tendenci_ia_produtos p WHERE p.id = tendenci_ia_produtos_estoque.produto_id AND public.tenant_rls_check(p.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.tendenci_ia_produtos p WHERE p.id = tendenci_ia_produtos_estoque.produto_id AND public.tenant_rls_check(p.tenant_id)));

-- Orphan budget tables (no parent with tenant_id; tables are empty) — restrict to OWNER only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budget_products','budget_product_lines','budget_template_lines'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_owner_only_restrict', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING (public.is_owner()) WITH CHECK (public.is_owner())$p$, t||'_owner_only_restrict', t);
  END LOOP;
END $$;
