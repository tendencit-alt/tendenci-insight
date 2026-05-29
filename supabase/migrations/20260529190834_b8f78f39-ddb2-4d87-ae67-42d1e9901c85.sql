
DO $$
DECLARE
  v_tenant uuid := '6f2fa786-e0a6-444e-8637-dbf55c4941dd';
  v_pt uuid := 'd6d30602-e36b-4c63-8c36-0dcad426c172';
  v_order uuid; v_item uuid; v_po uuid; v_d uuid; v_status text; v_count int;
BEGIN
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'em_producao') RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, descricao) VALUES (v_order, 'Item S1') RETURNING id INTO v_item;
  INSERT INTO public.production_orders (tenant_id, order_id, order_item_id, status, title, production_type_id)
    VALUES (v_tenant, v_order, v_item, 'em_producao', 'OP-S1b', v_pt) RETURNING id INTO v_po;
  SET LOCAL session_replication_role = 'origin';

  UPDATE public.production_orders SET status='concluido' WHERE id=v_po;
  SELECT count(*) INTO v_count FROM public.delivery_orders WHERE production_order_id=v_po;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,notes)
    VALUES ('scenario1b:auto_create_with_item',v_order,jsonb_build_object('po',v_po,'deliveries_created',v_count));

  SELECT id INTO v_d FROM public.delivery_orders WHERE production_order_id=v_po LIMIT 1;
  IF v_d IS NOT NULL THEN
    UPDATE public.delivery_orders SET scheduled_date=now()+interval '3 days', status='agendada', transportadora='Trans-X' WHERE id=v_d;
    SELECT status INTO v_status FROM public.delivery_orders WHERE id=v_d;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
      VALUES ('scenario2b:agendamento',v_order,v_status,'{}'::jsonb);

    UPDATE public.delivery_orders SET status='em_transito' WHERE id=v_d;
    SELECT status INTO v_status FROM public.delivery_orders WHERE id=v_d;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
      VALUES ('scenario3b:em_transito',v_order,v_status,'{}'::jsonb);
  END IF;
END $$;
