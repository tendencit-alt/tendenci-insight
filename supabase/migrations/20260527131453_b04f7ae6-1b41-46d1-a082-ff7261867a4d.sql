
-- crm_tasks: RESTRICTIVE via parent deal
DROP POLICY IF EXISTS "restrict_crm_tasks_tenant" ON public.crm_tasks;
CREATE POLICY "restrict_crm_tasks_tenant" ON public.crm_tasks
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_tasks.deal_id AND public.tenant_rls_check(d.tenant_id)
  )
)
WITH CHECK (
  public.is_owner() OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_tasks.deal_id AND public.tenant_rls_check(d.tenant_id)
  )
);

-- product_price_history: RESTRICTIVE on tenant_id
DROP POLICY IF EXISTS "restrict_product_price_history_tenant" ON public.product_price_history;
CREATE POLICY "restrict_product_price_history_tenant" ON public.product_price_history
AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
