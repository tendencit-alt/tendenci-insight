
DO $$
DECLARE
  v_tenant uuid := '6f2fa786-e0a6-444e-8637-dbf55c4941dd';
  v_order uuid;
  v_d1 uuid;
  v_d2 uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';
  INSERT INTO public.orders (tenant_id, status) VALUES (v_tenant, 'faturado') RETURNING id INTO v_order;
  INSERT INTO public.delivery_orders (tenant_id, order_id, status) VALUES (v_tenant, v_order, 'pendente') RETURNING id INTO v_d1;
  INSERT INTO public.delivery_orders (tenant_id, order_id, status) VALUES (v_tenant, v_order, 'pendente') RETURNING id INTO v_d2;
  SET LOCAL session_replication_role = 'origin';

  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,notes) VALUES ('scenario:step1_begin',v_order,jsonb_build_object('d1',v_d1,'d2',v_d2));
  UPDATE public.delivery_orders SET status='entregue', delivered_date=now() WHERE id=v_d1;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
  SELECT 'scenario:after_d1',v_order,o.status,jsonb_build_object('order_status',o.status) FROM public.orders o WHERE o.id=v_order;

  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,notes) VALUES ('scenario:step2_begin',v_order,'{}'::jsonb);
  UPDATE public.delivery_orders SET status='entregue', delivered_date=now() WHERE id=v_d2;
  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,final_status,notes)
  SELECT 'scenario:after_d2',v_order,o.status,jsonb_build_object('order_status',o.status) FROM public.orders o WHERE o.id=v_order;
END $$;
