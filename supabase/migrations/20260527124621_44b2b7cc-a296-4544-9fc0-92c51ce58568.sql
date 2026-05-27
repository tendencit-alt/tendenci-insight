
-- PART 1
ALTER TABLE public.order_responsibles ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.order_responsibles SET tenant_id = public.get_user_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE public.order_responsibles ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();
ALTER TABLE public.order_responsibles ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_responsibles_tenant ON public.order_responsibles(tenant_id);

ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.lead_attachments la SET tenant_id = l.tenant_id FROM public.leads l WHERE la.lead_id = l.id AND la.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_attachments_tenant ON public.lead_attachments(tenant_id);

ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.product_bom b SET tenant_id = p.tenant_id FROM public.products p WHERE b.product_id = p.id AND b.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_bom_tenant ON public.product_bom(tenant_id);

ALTER TABLE public.product_price_history ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.product_price_history h SET tenant_id = p.tenant_id FROM public.products p WHERE h.product_id = p.id AND h.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_price_history_tenant ON public.product_price_history(tenant_id);

ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.production_logs pl SET tenant_id = po.tenant_id FROM public.production_orders po WHERE pl.production_order_id = po.id AND pl.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_production_logs_tenant ON public.production_logs(tenant_id);

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['order_responsibles','lead_attachments','product_bom','product_price_history','production_logs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_admin_delete', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id))$p$, t||'_tenant_select', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.tenant_rls_check(tenant_id))$p$, t||'_tenant_insert', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id))$p$, t||'_tenant_update', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_owner() OR (public.tenant_rls_check(tenant_id) AND public.is_tenant_admin(tenant_id)))$p$, t||'_admin_delete', t);
  END LOOP;
END $$;

-- PART 2 — RESTRICTIVE defense-in-depth
DROP POLICY IF EXISTS order_items_tenant_restrict ON public.order_items;
CREATE POLICY order_items_tenant_restrict ON public.order_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.tenant_rls_check(o.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.tenant_rls_check(o.tenant_id)));

DROP POLICY IF EXISTS order_history_tenant_restrict ON public.order_history;
CREATE POLICY order_history_tenant_restrict ON public.order_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND public.tenant_rls_check(o.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND public.tenant_rls_check(o.tenant_id)));

DROP POLICY IF EXISTS product_suppliers_tenant_restrict ON public.product_suppliers;
CREATE POLICY product_suppliers_tenant_restrict ON public.product_suppliers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_suppliers.product_id AND public.tenant_rls_check(p.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_suppliers.product_id AND public.tenant_rls_check(p.tenant_id)));

DROP POLICY IF EXISTS product_cost_centers_tenant_restrict ON public.product_cost_centers;
CREATE POLICY product_cost_centers_tenant_restrict ON public.product_cost_centers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_cost_centers.product_id AND public.tenant_rls_check(p.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_cost_centers.product_id AND public.tenant_rls_check(p.tenant_id)));

DROP POLICY IF EXISTS production_attachments_tenant_restrict ON public.production_attachments;
CREATE POLICY production_attachments_tenant_restrict ON public.production_attachments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_attachments.production_order_id AND public.tenant_rls_check(po.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_attachments.production_order_id AND public.tenant_rls_check(po.tenant_id)));

DROP POLICY IF EXISTS production_products_tenant_restrict ON public.production_products;
CREATE POLICY production_products_tenant_restrict ON public.production_products AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_products.production_order_id AND public.tenant_rls_check(po.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.production_orders po WHERE po.id = production_products.production_order_id AND public.tenant_rls_check(po.tenant_id)));
