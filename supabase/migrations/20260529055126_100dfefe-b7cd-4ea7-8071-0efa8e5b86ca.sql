-- Function: copy Owner's finance rate tables into a target tenant (idempotent via ON CONFLICT)
CREATE OR REPLACE FUNCTION public.copy_owner_finance_rates_to_tenant(p_target_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
BEGIN
  IF p_target_tenant IS NULL OR p_target_tenant = v_owner THEN
    RETURN;
  END IF;

  -- credit_card_rates (inclui débito quando installments=0)
  INSERT INTO public.credit_card_rates (tenant_id, installments, rate_percent, active)
  SELECT p_target_tenant, installments, rate_percent, active
  FROM public.credit_card_rates
  WHERE tenant_id = v_owner
  ON CONFLICT (tenant_id, installments) DO NOTHING;

  -- payment_link_rates
  INSERT INTO public.payment_link_rates (tenant_id, installments, rate_percent, active)
  SELECT p_target_tenant, installments, rate_percent, active
  FROM public.payment_link_rates
  WHERE tenant_id = v_owner
  ON CONFLICT (tenant_id, installments) DO NOTHING;

  -- boleto_rates
  INSERT INTO public.boleto_rates (tenant_id, carencia_dias, installments, rate_percent, active)
  SELECT p_target_tenant, carencia_dias, installments, rate_percent, active
  FROM public.boleto_rates
  WHERE tenant_id = v_owner
  ON CONFLICT (tenant_id, carencia_dias, installments) DO NOTHING;

  -- fee_supplier_configs: copia apenas o chart_account_id (supplier_id é específico do tenant)
  INSERT INTO public.fee_supplier_configs (tenant_id, fee_type, supplier_id, chart_account_id)
  SELECT p_target_tenant, fee_type, NULL, chart_account_id
  FROM public.fee_supplier_configs
  WHERE tenant_id = v_owner
  ON CONFLICT (tenant_id, fee_type) DO NOTHING;
END;
$$;

-- Trigger: ao criar um novo tenant, espelhar as taxas do Owner
CREATE OR REPLACE FUNCTION public.tg_copy_owner_rates_on_tenant_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid THEN
    PERFORM public.copy_owner_finance_rates_to_tenant(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_owner_finance_rates ON public.tenants;
CREATE TRIGGER trg_copy_owner_finance_rates
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tg_copy_owner_rates_on_tenant_create();