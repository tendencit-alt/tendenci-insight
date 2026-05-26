
-- Conciliated ledger entry: admin can edit
CREATE OR REPLACE FUNCTION public.block_conciliated_ledger_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    IF NOT public.is_tenant_admin(OLD.tenant_id) THEN
      RAISE EXCEPTION 'Lançamento conciliado não permite alterações';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Conciliated payable: admin can edit
CREATE OR REPLACE FUNCTION public.block_conciliated_payable_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    IF NOT public.is_tenant_admin(OLD.tenant_id) THEN
      RAISE EXCEPTION 'Título conciliado não permite alterações';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Conciliated receivable: admin can edit
CREATE OR REPLACE FUNCTION public.block_conciliated_receivable_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    IF NOT public.is_tenant_admin(OLD.tenant_id) THEN
      RAISE EXCEPTION 'Título conciliado não permite alterações';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Payable status transition: admin bypass
CREATE OR REPLACE FUNCTION public.validate_payable_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_is_admin boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_is_admin := public.is_tenant_admin(OLD.tenant_id);

  IF OLD.status = 'CONCILIADO' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Título conciliado não pode ser alterado';
  END IF;

  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["CONFIRMADO", "PROVISIONADO", "PAGO", "CANCELADO"]',
    'PROVISIONADO', '["CONFIRMADO", "CANCELADO"]',
    'CONFIRMADO', '["PAGO", "PARCIALMENTE_PAGO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'VENCIDO', '["PAGO", "PARCIALMENTE_PAGO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'PARCIALMENTE_PAGO', '["PAGO", "CANCELADO", "EM_DISPUTA"]',
    'PAGO', '["CONCILIADO", "ABERTO"]',
    'EM_DISPUTA', '["CONFIRMADO", "CANCELADO", "PAGO"]',
    'RENEGOCIADO', '["CONFIRMADO", "CANCELADO"]',
    'CANCELADO', '["PROVISIONADO"]',
    'CONCILIADO', '[]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)) AS val;

  IF NOT v_is_admin THEN
    IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Transição de status inválida para conta a pagar: % → %. Permitidas: %',
        OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
    END IF;
    IF NEW.status = 'CONCILIADO' AND OLD.status != 'PAGO' THEN
      RAISE EXCEPTION 'Não é possível conciliar sem pagamento registrado';
    END IF;
  END IF;

  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now(); NEW.cancelado_por := auth.uid();
  END IF;
  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now(); NEW.conciliado_por := auth.uid(); NEW.reconciled := true;
  END IF;
  IF NEW.status = 'PAGO' AND OLD.status != 'PAGO' THEN
    NEW.payment_date := COALESCE(NEW.payment_date, now()::date);
  END IF;

  RETURN NEW;
END;
$function$;

-- Receivable status transition: admin bypass
CREATE OR REPLACE FUNCTION public.validate_receivable_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_is_admin boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_is_admin := public.is_tenant_admin(OLD.tenant_id);

  IF OLD.status = 'CONCILIADO' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Título conciliado não pode ser alterado';
  END IF;

  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["CONFIRMADO", "PROVISIONADO", "RECEBIDO", "CANCELADO"]',
    'PROVISIONADO', '["CONFIRMADO", "CANCELADO"]',
    'CONFIRMADO', '["RECEBIDO", "PARCIALMENTE_RECEBIDO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'VENCIDO', '["RECEBIDO", "PARCIALMENTE_RECEBIDO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'PARCIALMENTE_RECEBIDO', '["RECEBIDO", "CANCELADO", "EM_DISPUTA"]',
    'RECEBIDO', '["CONCILIADO", "ABERTO"]',
    'EM_DISPUTA', '["CONFIRMADO", "CANCELADO", "RECEBIDO"]',
    'RENEGOCIADO', '["CONFIRMADO", "CANCELADO"]',
    'CANCELADO', '["PROVISIONADO"]',
    'CONCILIADO', '[]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)) AS val;

  IF NOT v_is_admin THEN
    IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Transição de status inválida para conta a receber: % → %. Permitidas: %',
        OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
    END IF;
    IF NEW.status = 'CONCILIADO' AND OLD.status != 'RECEBIDO' THEN
      RAISE EXCEPTION 'Não é possível conciliar sem recebimento registrado';
    END IF;
  END IF;

  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now(); NEW.cancelado_por := auth.uid();
  END IF;
  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now(); NEW.conciliado_por := auth.uid(); NEW.reconciled := true;
  END IF;

  RETURN NEW;
END;
$function$;
