
CREATE OR REPLACE FUNCTION public.notify_low_stock_on_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev numeric;
  v_new numeric;
  v_min numeric;
  v_tenant uuid;
  v_name text;
  v_user uuid;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT current_stock, min_stock, tenant_id, name
    INTO v_new, v_min, v_tenant, v_name
  FROM public.products WHERE id = NEW.product_id;
  IF v_min IS NULL OR v_min <= 0 THEN
    RETURN NEW;
  END IF;
  -- previous = new - delta
  v_prev := CASE WHEN NEW.movement_type='entrada' THEN v_new - NEW.quantity
                 WHEN NEW.movement_type='saida'   THEN v_new + NEW.quantity
                 ELSE v_new END;
  IF v_prev >= v_min AND v_new < v_min THEN
    INSERT INTO public.erp_notifications(tenant_id, user_id, module, category, title, message,
      entity_table, entity_id, link_path, priority, channel, generated_by)
    SELECT v_tenant, ur.user_id, 'estoque', 'estoque_minimo',
      'Estoque abaixo do mínimo: ' || v_name,
      'O produto "' || v_name || '" atingiu ' || v_new || ' (mínimo ' || v_min || ').',
      'products', NEW.product_id, '/estoque', 'alta', 'sistema', 'notify_low_stock_on_movement'
    FROM public.user_tenants ur
    WHERE ur.tenant_id = v_tenant
    ON CONFLICT DO NOTHING;

    INSERT INTO public.cross_module_events(tenant_id, event_type, source_module, target_module,
      source_entity, source_entity_id, payload)
    VALUES (v_tenant, 'low_stock_threshold', 'estoque', 'compras',
      'products', NEW.product_id,
      jsonb_build_object('current_stock', v_new, 'min_stock', v_min, 'product_name', v_name));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.stock_movements;
CREATE TRIGGER trg_notify_low_stock
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock_on_movement();
