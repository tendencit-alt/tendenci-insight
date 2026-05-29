
-- 1. Add chart_account_id to purchase_orders (idempotent)
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS chart_account_id uuid;

-- 2. Idempotent + enriched: create payable only on confirmed PO, no duplicates
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
  -- Skip if no value
  IF NEW.total IS NULL OR NEW.total <= 0 THEN
    RETURN NEW;
  END IF;

  -- Decide whether to create
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

  -- Idempotency: skip if payable already exists for this PO
  SELECT EXISTS (
    SELECT 1 FROM public.fin_payables
    WHERE (order_id = NEW.id OR document_number = v_doc)
      AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(status, '') NOT IN ('CANCELADO')
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN NEW;
  END IF;

  -- Ledger entry
  INSERT INTO public.fin_ledger_entries (
    tenant_id, description, amount, type, competence_date,
    document_number, party_id, party_type, status, notes, created_by,
    cost_center_id, chart_account_id, order_id
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
    NEW.cost_center_id, NEW.chart_account_id, NEW.id
  ) RETURNING id INTO v_ledger_id;

  -- Payable
  INSERT INTO public.fin_payables (
    tenant_id, supplier_id, amount, due_date, competence_date, status,
    description, document_number, notes, ledger_entry_id, created_by,
    cost_center_id, chart_account_id, order_id, origem
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
    NEW.cost_center_id, NEW.chart_account_id, NEW.id, 'compra'
  );

  RETURN NEW;
END;
$function$;

-- 3. Recreate trigger for INSERT + UPDATE (replace existing INSERT-only)
DROP TRIGGER IF EXISTS trigger_create_payable_from_purchase ON public.purchase_orders;
CREATE TRIGGER trigger_create_payable_from_purchase
  AFTER INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payable_from_purchase_order();

-- 4. Notify on PO confirmed
CREATE OR REPLACE FUNCTION public.notify_purchase_order_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_statuses text[] := ARRAY['confirmado','aprovado','enviado'];
  v_should_notify boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_notify := NEW.status = ANY(v_active_statuses);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_notify := NEW.status = ANY(v_active_statuses)
      AND (OLD.status IS NULL OR NOT (OLD.status = ANY(v_active_statuses)));
  END IF;

  IF NOT v_should_notify OR NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cross-module event
  INSERT INTO public.cross_module_events (
    tenant_id, event_type, source_module, target_module,
    source_entity, source_entity_id, payload, status, created_by
  ) VALUES (
    NEW.tenant_id, 'purchase_order_confirmed', 'compras', 'financeiro',
    'purchase_order', NEW.id,
    jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total, 'supplier_id', NEW.supplier_id),
    'processed', NEW.created_by
  );

  -- Notification to the buyer (created_by)
  INSERT INTO public.erp_notifications (
    tenant_id, user_id, module, category, title, message,
    entity_table, entity_id, link_path, priority, generated_by
  ) VALUES (
    NEW.tenant_id, NEW.created_by, 'compras', 'success',
    'Pedido de Compra #' || NEW.order_number || ' confirmado',
    'Conta a pagar gerada automaticamente.',
    'purchase_orders', NEW.id, '/compras', 'normal', 'trigger:notify_purchase_order_confirmed'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_purchase_confirmed ON public.purchase_orders;
CREATE TRIGGER trg_notify_purchase_confirmed
  AFTER INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_purchase_order_confirmed();

-- 5. Notify on stock entry from PO (recebimento)
CREATE OR REPLACE FUNCTION public.notify_purchase_receipt_stock_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_po record;
BEGIN
  IF NEW.reference_type IS DISTINCT FROM 'purchase_order' OR NEW.movement_type IS DISTINCT FROM 'entrada' THEN
    RETURN NEW;
  END IF;
  IF NEW.reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, order_number, tenant_id, created_by
    INTO v_po
  FROM public.purchase_orders
  WHERE id = NEW.reference_id;

  IF v_po.id IS NULL OR v_po.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.erp_notifications (
    tenant_id, user_id, module, category, title, message,
    entity_table, entity_id, link_path, priority, generated_by
  ) VALUES (
    v_po.tenant_id, v_po.created_by, 'compras', 'info',
    'Recebimento registrado - PC #' || v_po.order_number,
    'Entrada de ' || NEW.quantity::text || ' unidade(s) registrada no estoque.',
    'purchase_orders', v_po.id, '/compras', 'normal', 'trigger:notify_purchase_receipt_stock_entry'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_purchase_receipt ON public.stock_movements;
CREATE TRIGGER trg_notify_purchase_receipt
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_purchase_receipt_stock_entry();

-- 6. Daily cron: notify buyer of overdue POs
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.notify_overdue_purchase_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_po record;
BEGIN
  FOR v_po IN
    SELECT po.id, po.tenant_id, po.order_number, po.expected_date, po.created_by
    FROM public.purchase_orders po
    WHERE po.expected_date IS NOT NULL
      AND po.expected_date::date < CURRENT_DATE
      AND COALESCE(po.status, '') NOT IN ('recebido_total','cancelado','rascunho')
      AND po.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.erp_notifications n
        WHERE n.entity_table = 'purchase_orders'
          AND n.entity_id = po.id
          AND n.category = 'warning'
          AND n.generated_by = 'cron:notify_overdue_purchase_orders'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO public.erp_notifications (
      tenant_id, user_id, module, category, title, message,
      entity_table, entity_id, link_path, priority, generated_by
    ) VALUES (
      v_po.tenant_id, v_po.created_by, 'compras', 'warning',
      'Pedido de Compra #' || v_po.order_number || ' atrasado',
      'Data prevista: ' || to_char(v_po.expected_date, 'DD/MM/YYYY'),
      'purchase_orders', v_po.id, '/compras', 'high', 'cron:notify_overdue_purchase_orders'
    );
  END LOOP;
END;
$function$;

-- Schedule once (idempotent: unschedule then schedule)
DO $$
BEGIN
  PERFORM cron.unschedule('notify-overdue-purchase-orders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'notify-overdue-purchase-orders',
  '0 9 * * *',
  $$SELECT public.notify_overdue_purchase_orders();$$
);
