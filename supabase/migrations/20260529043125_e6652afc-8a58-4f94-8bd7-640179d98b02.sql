
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

  INSERT INTO public.cross_module_events (
    tenant_id, event_type, source_module, target_module,
    source_entity, source_entity_id, payload, status, created_by
  ) VALUES (
    NEW.tenant_id, 'purchase_order_confirmed', 'compras', 'financeiro',
    'purchase_order', NEW.id,
    jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total, 'supplier_id', NEW.supplier_id),
    'processed', NEW.created_by
  );

  INSERT INTO public.erp_notifications (
    tenant_id, user_id, module, category, title, message,
    entity_table, entity_id, link_path, priority, generated_by
  ) VALUES (
    NEW.tenant_id, NEW.created_by, 'compras', 'success',
    'Pedido de Compra #' || NEW.order_number || ' confirmado',
    'Conta a pagar gerada automaticamente.',
    'purchase_orders', NEW.id, '/compras', 'media', 'trigger:notify_purchase_order_confirmed'
  );

  RETURN NEW;
END;
$function$;

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

  SELECT id, order_number, tenant_id, created_by INTO v_po
  FROM public.purchase_orders WHERE id = NEW.reference_id;

  IF v_po.id IS NULL OR v_po.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.erp_notifications (
    tenant_id, user_id, module, category, title, message,
    entity_table, entity_id, link_path, priority, generated_by
  ) VALUES (
    v_po.tenant_id, v_po.created_by, 'compras', 'info',
    'Recebimento registrado - PC #' || v_po.order_number,
    'Entrada de ' || NEW.quantity::text || ' unidade(s) no estoque.',
    'purchase_orders', v_po.id, '/compras', 'media', 'trigger:notify_purchase_receipt_stock_entry'
  );

  RETURN NEW;
END;
$function$;

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
        WHERE n.entity_table = 'purchase_orders' AND n.entity_id = po.id
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
      'purchase_orders', v_po.id, '/compras', 'alta', 'cron:notify_overdue_purchase_orders'
    );
  END LOOP;
END;
$function$;
