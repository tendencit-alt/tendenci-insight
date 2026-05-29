
CREATE OR REPLACE FUNCTION public.create_payable_from_purchase_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger_id uuid;
  v_doc text;
  v_should_create boolean := false;
  v_already_exists boolean;
  v_active_statuses text[] := ARRAY['confirmado','aprovado','enviado','recebido_parcial','recebido_total'];
BEGIN
  IF NEW.total IS NULL OR NEW.total <= 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_should_create := NEW.status = ANY(v_active_statuses);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_create := NEW.status = ANY(v_active_statuses)
      AND (OLD.status IS NULL OR NOT (OLD.status = ANY(v_active_statuses)));
  END IF;

  IF NOT v_should_create THEN
    RETURN NEW;
  END IF;

  v_doc := 'PC-' || NEW.order_number::text;

  SELECT EXISTS (
    SELECT 1 FROM public.fin_payables
    WHERE document_number = v_doc
      AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(status, '') NOT IN ('CANCELADO')
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.fin_ledger_entries (
    tenant_id, description, amount, type, competence_date,
    document_number, party_id, party_type, status, notes, created_by,
    cost_center_id, chart_account_id
  ) VALUES (
    NEW.tenant_id,
    'Pedido de Compra #' || NEW.order_number,
    NEW.total,
    'DESPESA',
    COALESCE(NEW.issue_date::date, NEW.created_at::date),
    v_doc,
    NEW.supplier_id, 'supplier', 'ABERTO',
    'Gerado automaticamente via pedido de compra',
    NEW.created_by,
    NEW.cost_center_id, NEW.chart_account_id
  ) RETURNING id INTO v_ledger_id;

  INSERT INTO public.fin_payables (
    tenant_id, supplier_id, amount, due_date, competence_date, status,
    description, document_number, notes, ledger_entry_id, created_by,
    cost_center_id, chart_account_id, origem
  ) VALUES (
    NEW.tenant_id,
    NEW.supplier_id, NEW.total,
    COALESCE(NEW.expected_date::date, (NEW.created_at + interval '30 days')::date),
    COALESCE(NEW.issue_date::date, NEW.created_at::date),
    'ABERTO',
    'Pedido de Compra #' || NEW.order_number,
    v_doc,
    'Gerado automaticamente via pedido de compra',
    v_ledger_id, NEW.created_by,
    NEW.cost_center_id, NEW.chart_account_id, 'compra'
  );

  RETURN NEW;
END;
$function$;
