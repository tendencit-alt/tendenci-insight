
CREATE OR REPLACE FUNCTION public.cancel_linked_financial_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cancellable_statuses text[] := ARRAY['ABERTO', 'PROVISIONADO', 'CONFIRMADO', 'VENCIDO'];
  v_reason text := 'Cancelamento automático - Documento origem cancelado';
  v_user_id uuid := auth.uid();
  v_count_ledger int := 0;
  v_count_payables int := 0;
  v_count_receivables int := 0;
  v_is_purchase boolean := (TG_TABLE_NAME = 'purchase_orders');
  v_doc text;
BEGIN
  IF NEW.status NOT IN ('cancelado', 'CANCELADO') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF v_is_purchase THEN
    v_doc := 'PC-' || NEW.order_number::text;

    UPDATE public.fin_ledger_entries
    SET status='CANCELADO', cancelado_em=now(), cancelado_por=v_user_id, motivo_cancelamento=v_reason
    WHERE document_number = v_doc
      AND COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
      AND status = ANY(v_cancellable_statuses);
    GET DIAGNOSTICS v_count_ledger = ROW_COUNT;

    UPDATE public.fin_payables
    SET status='CANCELADO', cancelado_em=now(), cancelado_por=v_user_id, motivo_cancelamento=v_reason
    WHERE document_number = v_doc
      AND COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
      AND status = ANY(v_cancellable_statuses);
    GET DIAGNOSTICS v_count_payables = ROW_COUNT;
  ELSE
    UPDATE public.fin_ledger_entries
    SET status='CANCELADO', cancelado_em=now(), cancelado_por=v_user_id, motivo_cancelamento=v_reason
    WHERE order_id = NEW.id AND status = ANY(v_cancellable_statuses);
    GET DIAGNOSTICS v_count_ledger = ROW_COUNT;

    UPDATE public.fin_payables
    SET status='CANCELADO', cancelado_em=now(), cancelado_por=v_user_id, motivo_cancelamento=v_reason
    WHERE order_id = NEW.id AND status = ANY(v_cancellable_statuses);
    GET DIAGNOSTICS v_count_payables = ROW_COUNT;

    UPDATE public.fin_receivables
    SET status='CANCELADO', cancelado_em=now(), cancelado_por=v_user_id, motivo_cancelamento=v_reason
    WHERE order_id = NEW.id AND status = ANY(v_cancellable_statuses);
    GET DIAGNOSTICS v_count_receivables = ROW_COUNT;
  END IF;

  IF (v_count_ledger + v_count_payables + v_count_receivables) > 0 THEN
    INSERT INTO public.audit_log (
      table_name, record_id, event_type, event_source,
      field_name, old_value, new_value, user_id, metadata
    ) VALUES (
      TG_TABLE_NAME, NEW.id::text, 'FINANCIAL_AUTO_CANCEL', 'cancel_linked_financial_entries',
      'status', OLD.status, NEW.status, v_user_id,
      jsonb_build_object('ledger_cancelled', v_count_ledger, 'payables_cancelled', v_count_payables, 'receivables_cancelled', v_count_receivables)
    );
  END IF;

  RETURN NEW;
END;
$function$;
