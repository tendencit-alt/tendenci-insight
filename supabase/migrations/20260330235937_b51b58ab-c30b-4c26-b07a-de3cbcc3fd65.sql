
-- Fix BOTH functions in one migration
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO production_phases (production_order_id, phase_template_id, status, position)
  SELECT NEW.id, ppt.id, 'pendente', ppt.position
  FROM production_phase_templates ppt
  WHERE ppt.production_type_id = NEW.production_type_id
  ORDER BY ppt.position;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_production_on_order_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_production_type_id UUID;
  v_start_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_item RECORD;
BEGIN
  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'ativo') THEN
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN RETURN NEW; END IF;
    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;
    FOR v_item IN 
      SELECT DISTINCT centro_custo FROM order_items 
      WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      SELECT id INTO v_production_type_id FROM production_types WHERE active = true 
        AND (name ILIKE '%' || v_item.centro_custo || '%' OR v_item.centro_custo ILIKE '%' || name || '%')
      LIMIT 1;
      IF v_production_type_id IS NULL THEN CONTINUE; END IF;
      INSERT INTO production_orders (order_id, production_type_id, client_id, title, status, priority)
      VALUES (NEW.id, v_production_type_id, NEW.client_id,
        'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente'), 'aguardando', 'normal')
      RETURNING id INTO v_new_op_id;
      SELECT id INTO v_start_phase_id FROM production_phases WHERE production_order_id = v_new_op_id ORDER BY position LIMIT 1;
      IF v_start_phase_id IS NOT NULL THEN
        UPDATE production_orders SET current_phase_id = v_start_phase_id WHERE id = v_new_op_id;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN NEW.status := 'em_producao'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-trigger order #40
UPDATE public.orders SET status = 'rascunho' WHERE id = '8f0fea5d-c8e0-4a1f-9a1b-0a7e05490502';
UPDATE public.orders SET status = 'ativo', updated_at = now() WHERE id = '8f0fea5d-c8e0-4a1f-9a1b-0a7e05490502';
