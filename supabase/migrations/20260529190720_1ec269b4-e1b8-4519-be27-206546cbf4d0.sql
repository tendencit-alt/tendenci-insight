
DO $$
DECLARE
  v_tenant uuid := '6f2fa786-e0a6-444e-8637-dbf55c4941dd';
  v_pt uuid := 'd6d30602-e36b-4c63-8c36-0dcad426c172';
  v_order uuid; v_po uuid; v_d uuid; v_status text; v_count int;
BEGIN
  -- SCENARIO 1: AUTO-CREATE
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'em_producao') RETURNING id INTO v_order;
  INSERT INTO public.production_orders (tenant_id, order_id, status, title, production_type_id)
    VALUES (v_tenant, v_order, 'em_producao', 'OP-S1', v_pt) RETURNING id INTO v_po;
  SET LOCAL session_replication_role = 'origin';

  UPDATE public.production_orders SET status='concluido' WHERE id=v_po;
  SELECT count(*) INTO v_count FROM public.delivery_orders WHERE production_order_id=v_po;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,notes)
    VALUES ('scenario1:auto_create',v_order,jsonb_build_object('po',v_po,'deliveries_created',v_count));

  -- SCENARIO 2: AGENDAMENTO
  SELECT id INTO v_d FROM public.delivery_orders WHERE production_order_id=v_po LIMIT 1;
  IF v_d IS NOT NULL THEN
    UPDATE public.delivery_orders SET scheduled_date=now()+interval '3 days', transportadora='Trans-X' WHERE id=v_d;
    SELECT status INTO v_status FROM public.delivery_orders WHERE id=v_d;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
      VALUES ('scenario2:agendamento',v_order,v_status,jsonb_build_object('delivery',v_d));
    -- SCENARIO 3: EM ROTA
    UPDATE public.delivery_orders SET status='em_rota' WHERE id=v_d;
    SELECT status INTO v_status FROM public.delivery_orders WHERE id=v_d;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
      VALUES ('scenario3:em_rota',v_order,v_status,'{}'::jsonb);
  END IF;

  -- SCENARIO 4: ENTREGUE pedido único (from aprovado)
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'aprovado') RETURNING id INTO v_order;
  INSERT INTO public.delivery_orders (tenant_id, order_id, status) VALUES (v_tenant, v_order, 'pendente') RETURNING id INTO v_d;
  SET LOCAL session_replication_role = 'origin';

  UPDATE public.delivery_orders SET status='entregue', delivered_date=now() WHERE id=v_d;
  SELECT status INTO v_status FROM public.orders WHERE id=v_order;
  SELECT count(*) INTO v_count FROM public.audit_log WHERE record_id=v_order::text AND event_type='auto_promote';
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
    VALUES ('scenario4:full_path_from_aprovado',v_order,v_status,jsonb_build_object('auto_promote_logs',v_count));

  -- SCENARIO 6: CANCELAR (delivery cancel should NOT close order)
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'faturado') RETURNING id INTO v_order;
  INSERT INTO public.delivery_orders (tenant_id, order_id, status) VALUES (v_tenant, v_order, 'pendente') RETURNING id INTO v_d;
  SET LOCAL session_replication_role = 'origin';

  UPDATE public.delivery_orders SET status='cancelada' WHERE id=v_d;
  SELECT status INTO v_status FROM public.orders WHERE id=v_order;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
    VALUES ('scenario6:cancel_does_not_close_order',v_order,v_status,jsonb_build_object('expected','faturado'));

  -- SCENARIO 7: ATRASO
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'faturado') RETURNING id INTO v_order;
  INSERT INTO public.delivery_orders (tenant_id, order_id, status, scheduled_date)
    VALUES (v_tenant, v_order, 'pendente', now() - interval '2 days') RETURNING id INTO v_d;
  SET LOCAL session_replication_role = 'origin';
  SELECT status INTO v_status FROM public.delivery_orders WHERE id=v_d;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
    VALUES ('scenario7:atraso',v_order,v_status,jsonb_build_object(
      'is_overdue', (now()::date > (SELECT scheduled_date::date FROM public.delivery_orders WHERE id=v_d)),
      'days_late', (now()::date - (SELECT scheduled_date::date FROM public.delivery_orders WHERE id=v_d))));
END $$;
