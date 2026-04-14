-- Function to cancel all linked financial entries when source document is cancelled
CREATE OR REPLACE FUNCTION public.cancel_linked_financial_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancellable_statuses text[] := ARRAY['ABERTO', 'PROVISIONADO', 'CONFIRMADO', 'VENCIDO'];
  v_reason text := 'Cancelamento automático - Documento origem cancelado';
  v_user_id uuid := auth.uid();
  v_count_ledger int := 0;
  v_count_payables int := 0;
  v_count_receivables int := 0;
BEGIN
  -- Only fire when status changes TO cancelled
  IF NEW.status NOT IN ('cancelado', 'CANCELADO') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Cancel ledger entries linked to this order
  UPDATE public.fin_ledger_entries
  SET status = 'CANCELADO',
      cancelado_em = now(),
      cancelado_por = v_user_id,
      motivo_cancelamento = v_reason
  WHERE order_id = NEW.id
    AND status = ANY(v_cancellable_statuses);
  GET DIAGNOSTICS v_count_ledger = ROW_COUNT;

  -- Cancel payables linked to this order
  UPDATE public.fin_payables
  SET status = 'CANCELADO',
      cancelado_em = now(),
      cancelado_por = v_user_id,
      motivo_cancelamento = v_reason
  WHERE order_id = NEW.id
    AND status = ANY(v_cancellable_statuses);
  GET DIAGNOSTICS v_count_payables = ROW_COUNT;

  -- Cancel receivables linked to this order
  UPDATE public.fin_receivables
  SET status = 'CANCELADO',
      cancelado_em = now(),
      cancelado_por = v_user_id,
      motivo_cancelamento = v_reason
  WHERE order_id = NEW.id
    AND status = ANY(v_cancellable_statuses);
  GET DIAGNOSTICS v_count_receivables = ROW_COUNT;

  -- Audit log
  IF (v_count_ledger + v_count_payables + v_count_receivables) > 0 THEN
    INSERT INTO public.audit_log (
      table_name, record_id, event_type, event_source,
      field_name, old_value, new_value, user_id,
      metadata
    ) VALUES (
      TG_TABLE_NAME, NEW.id::text, 'FINANCIAL_AUTO_CANCEL', 'cancel_linked_financial_entries',
      'status', OLD.status, NEW.status, v_user_id,
      jsonb_build_object(
        'ledger_cancelled', v_count_ledger,
        'payables_cancelled', v_count_payables,
        'receivables_cancelled', v_count_receivables
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on orders table
DROP TRIGGER IF EXISTS trg_orders_cancel_financials ON public.orders;
CREATE TRIGGER trg_orders_cancel_financials
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelado', 'CANCELADO') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.cancel_linked_financial_entries();

-- Trigger on purchase_orders table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_purchase_orders_cancel_financials ON public.purchase_orders';
    EXECUTE 'CREATE TRIGGER trg_purchase_orders_cancel_financials
      BEFORE UPDATE ON public.purchase_orders
      FOR EACH ROW
      WHEN (NEW.status IN (''cancelado'', ''CANCELADO'') AND OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION public.cancel_linked_financial_entries()';
  END IF;
END
$$;