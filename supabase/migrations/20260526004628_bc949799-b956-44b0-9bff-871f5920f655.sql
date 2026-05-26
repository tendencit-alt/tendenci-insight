
-- Cascade-delete all records originated by an order when the order is deleted

CREATE OR REPLACE FUNCTION public.cascade_delete_order_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Financial records originated by the order
  DELETE FROM public.fin_ledger_entries WHERE order_id = OLD.id;
  DELETE FROM public.fin_receivables   WHERE order_id = OLD.id;
  DELETE FROM public.fin_payables      WHERE order_id = OLD.id;

  -- Production records linked to the order or its items
  DELETE FROM public.production_orders
    WHERE order_id = OLD.id
       OR order_item_id IN (SELECT id FROM public.order_items WHERE order_id = OLD.id);

  -- Strategic commitments tied to the order (if table exists rows)
  DELETE FROM public.order_strategic_commitments WHERE order_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_delete_order_dependencies ON public.orders;
CREATE TRIGGER trg_cascade_delete_order_dependencies
BEFORE DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_order_dependencies();

-- Make recalc robust when order no longer exists (parent being deleted)
CREATE OR REPLACE FUNCTION public.recalculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subtotal NUMERIC(15,2);
  v_order_record RECORD;
  v_desconto_calc NUMERIC(15,2);
  v_total NUMERIC(15,2);
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT * INTO v_order_record FROM orders WHERE id = v_order_id;
  IF NOT FOUND THEN
    -- Order is being deleted; nothing to recalc
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(valor_total), 0) INTO v_subtotal
  FROM order_items WHERE order_id = v_order_id;

  IF v_order_record.desconto_percentual > 0 THEN
    v_desconto_calc := v_subtotal * (v_order_record.desconto_percentual / 100);
  ELSE
    v_desconto_calc := COALESCE(v_order_record.desconto_valor, 0);
  END IF;

  v_total := v_subtotal - v_desconto_calc + COALESCE(v_order_record.valor_frete, 0);

  UPDATE orders
  SET subtotal = v_subtotal, valor_total = v_total
  WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
