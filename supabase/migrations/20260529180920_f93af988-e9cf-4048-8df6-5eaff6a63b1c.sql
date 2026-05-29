
CREATE OR REPLACE FUNCTION public.auto_create_delivery_on_production_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order_id uuid; v_tenant uuid; v_existing uuid; v_seller uuid; v_order_number int;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    SELECT oi.order_id INTO v_order_id FROM public.order_items oi WHERE oi.id = NEW.order_item_id;
    IF v_order_id IS NULL THEN RETURN NEW; END IF;
    v_tenant := NEW.tenant_id;
    SELECT id INTO v_existing FROM public.delivery_orders
      WHERE production_order_id = NEW.id AND tenant_id = v_tenant LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;
    INSERT INTO public.delivery_orders (tenant_id, order_id, production_order_id, status, observacoes)
    VALUES (v_tenant, v_order_id, NEW.id, 'pendente',
            'Criada automaticamente ao concluir OP ' || COALESCE(NEW.order_number::text, NEW.id::text));
    INSERT INTO public.cross_module_events
      (tenant_id, event_type, source_module, target_module, source_entity, source_entity_id,
       target_entity, target_entity_id, payload, status)
    VALUES (v_tenant, 'op_pronta_para_entrega', 'producao', 'fulfillment',
            'production_orders', NEW.id, 'orders', v_order_id,
            jsonb_build_object('production_order_id', NEW.id, 'order_id', v_order_id), 'pending');
    SELECT vendedor_id, order_number INTO v_seller, v_order_number FROM public.orders WHERE id = v_order_id;
    IF v_seller IS NOT NULL THEN
      INSERT INTO public.erp_notifications
        (tenant_id, user_id, module, category, title, message, entity_table, entity_id,
         link_path, priority, channel, generated_by)
      VALUES (v_tenant, v_seller, 'fulfillment', 'op_ready',
              'OP pronta para entrega',
              'Pedido #' || COALESCE(v_order_number::text,'?') || ' tem produção concluída. Agende a entrega.',
              'delivery_orders', NULL, '/entregas-montagem', 'alta', 'sistema',
              'auto_create_delivery_on_production_completed');
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.auto_create_delivery_on_production_completed() FROM PUBLIC, anon;
