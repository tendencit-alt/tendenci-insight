
-- Admin/Owner bypass on remaining blocking triggers

CREATE OR REPLACE FUNCTION public.block_conciliated_ledger_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND NOT public.is_tenant_admin(OLD.tenant_id) THEN
    RAISE EXCEPTION 'Lançamento conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_conciliated_payable_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND NOT public.is_tenant_admin(OLD.tenant_id) THEN
    RAISE EXCEPTION 'Título conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_conciliated_receivable_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND NOT public.is_tenant_admin(OLD.tenant_id) THEN
    RAISE EXCEPTION 'Título conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_block_parent_cc_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cost_center_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.fin_cost_centers WHERE parent_id = NEW.cost_center_id)
     AND NOT public.is_tenant_admin(NEW.tenant_id) THEN
    RAISE EXCEPTION 'Centros de custo pai não recebem lançamentos. Selecione um centro de custo filho.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_ledger_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Admin/Owner bypass: allow any transition
  IF public.is_tenant_admin(OLD.tenant_id) THEN
    IF NEW.status = 'CANCELADO' THEN
      NEW.cancelado_em := now();
      NEW.cancelado_por := auth.uid();
    END IF;
    IF NEW.status = 'CONCILIADO' THEN
      NEW.conciliado_em := now();
      NEW.reconciled := true;
    END IF;
    RETURN NEW;
  END IF;

  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["PAGO_RECEBIDO", "CANCELADO", "VENCIDO"]',
    'VENCIDO', '["PAGO_RECEBIDO", "CANCELADO"]',
    'PAGO_RECEBIDO', '["CONCILIADO", "ABERTO"]',
    'CONCILIADO', '[]',
    'CANCELADO', '["ABERTO"]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)
  ) AS val;

  IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida no razão: % → %. Permitidas: %',
      OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
  END IF;

  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now();
    NEW.cancelado_por := auth.uid();
  END IF;

  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now();
    NEW.reconciled := true;
  END IF;

  RETURN NEW;
END;
$$;
