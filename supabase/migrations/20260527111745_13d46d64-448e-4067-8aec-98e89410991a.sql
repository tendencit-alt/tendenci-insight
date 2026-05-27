
DO $$
DECLARE _id uuid := '00000000-0000-0000-0000-0000000abcde';
BEGIN
  DELETE FROM public.fin_strategic_resource_account_configs WHERE tenant_id=_id;
  DELETE FROM public.fin_bank_accounts WHERE tenant_id=_id;
  DELETE FROM public.production_types WHERE tenant_id=_id;
  DELETE FROM public.stock_locations WHERE tenant_id=_id;
  DELETE FROM public.product_categories WHERE tenant_id=_id;
  DELETE FROM public.fin_chart_accounts WHERE tenant_id=_id;
  ALTER TABLE public.fin_cost_centers DISABLE TRIGGER USER;
  DELETE FROM public.fin_cost_centers WHERE tenant_id=_id;
  ALTER TABLE public.fin_cost_centers ENABLE TRIGGER USER;
  DELETE FROM public.audit_log WHERE tenant_id=_id;
  DELETE FROM public.tenants WHERE id=_id;
END $$;
