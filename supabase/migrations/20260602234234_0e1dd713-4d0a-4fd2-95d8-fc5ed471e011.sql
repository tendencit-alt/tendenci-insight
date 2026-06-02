-- Allow the order->OP sync trigger to bypass the immutability lock
CREATE OR REPLACE FUNCTION public.sync_production_orders_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_entrega_prevista IS DISTINCT FROM OLD.data_entrega_prevista THEN
    PERFORM set_config('app.allow_due_date_change', 'true', true);
    UPDATE public.production_orders
       SET planned_end_date = NEW.data_entrega_prevista
     WHERE order_id = NEW.id;
    PERFORM set_config('app.allow_due_date_change', 'false', true);
  END IF;
  RETURN NEW;
END;
$function$;

-- One-time backfill: align existing OPs with their order deadline
DO $$
BEGIN
  PERFORM set_config('app.allow_due_date_change', 'true', true);
  UPDATE public.production_orders po
     SET planned_end_date = o.data_entrega_prevista
    FROM public.orders o
   WHERE po.order_id = o.id
     AND o.data_entrega_prevista IS NOT NULL
     AND (po.planned_end_date IS NULL OR po.planned_end_date::date <> o.data_entrega_prevista);
  PERFORM set_config('app.allow_due_date_change', 'false', true);
END $$;