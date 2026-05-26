
CREATE OR REPLACE FUNCTION public.fulfillment_evaluate_order_status(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_status text;
  v_total_del int;
  v_done_del int;
  v_total_ins int;
  v_done_ins int;
BEGIN
  IF _order_id IS NULL THEN RETURN; END IF;

  SELECT tenant_id, status INTO v_tenant, v_status
  FROM public.orders WHERE id = _order_id;

  IF v_tenant IS NULL THEN RETURN; END IF;
  -- never override final or cancelled states
  IF v_status IN ('entregue', 'encerrado', 'cancelado') THEN RETURN; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'entregue')
    INTO v_total_del, v_done_del
  FROM public.delivery_orders
  WHERE order_id = _order_id AND tenant_id = v_tenant;

  SELECT count(*), count(*) FILTER (WHERE status = 'concluida')
    INTO v_total_ins, v_done_ins
  FROM public.installation_orders
  WHERE order_id = _order_id AND tenant_id = v_tenant;

  -- must have at least one fulfillment record
  IF (v_total_del + v_total_ins) = 0 THEN RETURN; END IF;

  -- all deliveries done; installations done if any exist
  IF v_total_del > 0 AND v_done_del < v_total_del THEN RETURN; END IF;
  IF v_total_ins > 0 AND v_done_ins < v_total_ins THEN RETURN; END IF;

  UPDATE public.orders
     SET status = 'entregue', updated_at = now()
   WHERE id = _order_id AND tenant_id = v_tenant
     AND status NOT IN ('entregue', 'encerrado', 'cancelado');

  IF FOUND THEN
    INSERT INTO public.cross_module_events
      (tenant_id, event_type, source_module, target_module,
       source_entity, source_entity_id, target_entity, target_entity_id,
       payload, status)
    VALUES
      (v_tenant, 'order_auto_delivered', 'fulfillment', 'orders',
       'fulfillment', _order_id, 'orders', _order_id,
       jsonb_build_object(
         'previous_status', v_status,
         'new_status', 'entregue',
         'total_deliveries', v_total_del,
         'total_installations', v_total_ins
       ),
       'processed');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fulfillment_evaluate_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fulfillment_evaluate_order_status(OLD.order_id);
    RETURN OLD;
  END IF;

  -- Only evaluate on relevant changes
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.fulfillment_evaluate_order_status(NEW.order_id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN
    PERFORM public.fulfillment_evaluate_order_status(OLD.order_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_orders_evaluate ON public.delivery_orders;
CREATE TRIGGER trg_delivery_orders_evaluate
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_fulfillment_evaluate_order();

DROP TRIGGER IF EXISTS trg_installation_orders_evaluate ON public.installation_orders;
CREATE TRIGGER trg_installation_orders_evaluate
AFTER INSERT OR UPDATE OR DELETE ON public.installation_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_fulfillment_evaluate_order();
