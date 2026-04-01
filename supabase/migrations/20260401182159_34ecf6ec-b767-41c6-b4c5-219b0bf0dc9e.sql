
-- 1) Simplify trigger function - let create_phases_on_op_insert handle phase creation
CREATE OR REPLACE FUNCTION public.create_production_on_order_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_production_type_id UUID;
  v_first_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_item RECORD;
BEGIN
  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'ativo') THEN
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;

    FOR v_item IN
      SELECT id, descricao, centro_custo
      FROM order_items
      WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      SELECT id INTO v_production_type_id
      FROM production_types
      WHERE active = true AND (
        name = v_item.centro_custo
        OR name ILIKE '%' || v_item.centro_custo || '%'
        OR v_item.centro_custo ILIKE '%' || name || '%'
      )
      LIMIT 1;

      IF v_production_type_id IS NULL THEN CONTINUE; END IF;

      -- Insert OP - phases will be created automatically by create_phases_on_op_insert trigger
      INSERT INTO production_orders (
        order_id, order_item_id, production_type_id, client_id,
        title, status, priority
      )
      VALUES (
        NEW.id, v_item.id, v_production_type_id, NEW.client_id,
        'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_item.descricao, COALESCE(v_client_name, 'Cliente')),
        'aguardando', 'normal'
      )
      RETURNING id INTO v_new_op_id;

      -- Set current_phase_id to the first phase (created by the AFTER INSERT trigger)
      SELECT id INTO v_first_phase_id
      FROM production_phases
      WHERE production_order_id = v_new_op_id
      ORDER BY position ASC
      LIMIT 1;

      IF v_first_phase_id IS NOT NULL THEN
        UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = v_new_op_id;
        UPDATE production_phases SET status = 'em_andamento', started_at = now() WHERE id = v_first_phase_id;
      END IF;

      UPDATE order_items SET production_order_id = v_new_op_id WHERE id = v_item.id;
    END LOOP;

    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      NEW.status := 'em_producao';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Retroactively create OPs for existing active orders (phases auto-created by trigger)
DO $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_production_type_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_first_phase_id UUID;
BEGIN
  FOR v_order IN
    SELECT o.id, o.order_number, o.client_id
    FROM orders o
    WHERE o.status IN ('ativo', 'em_producao')
    AND NOT EXISTS (SELECT 1 FROM production_orders po WHERE po.order_id = o.id)
  LOOP
    SELECT name INTO v_client_name FROM clients WHERE id = v_order.client_id;

    FOR v_item IN
      SELECT id, descricao, centro_custo
      FROM order_items
      WHERE order_id = v_order.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      SELECT id INTO v_production_type_id
      FROM production_types
      WHERE active = true AND (
        name = v_item.centro_custo
        OR name ILIKE '%' || v_item.centro_custo || '%'
        OR v_item.centro_custo ILIKE '%' || name || '%'
      )
      LIMIT 1;

      IF v_production_type_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO production_orders (
        order_id, order_item_id, production_type_id, client_id,
        title, status, priority
      )
      VALUES (
        v_order.id, v_item.id, v_production_type_id, v_order.client_id,
        'Pedido #' || v_order.order_number || ' - ' || COALESCE(v_item.descricao, COALESCE(v_client_name, 'Cliente')),
        'aguardando', 'normal'
      )
      RETURNING id INTO v_new_op_id;

      -- Set first phase as current and em_andamento
      SELECT id INTO v_first_phase_id
      FROM production_phases
      WHERE production_order_id = v_new_op_id
      ORDER BY position ASC
      LIMIT 1;

      IF v_first_phase_id IS NOT NULL THEN
        UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = v_new_op_id;
        UPDATE production_phases SET status = 'em_andamento', started_at = now() WHERE id = v_first_phase_id;
      END IF;

      UPDATE order_items SET production_order_id = v_new_op_id WHERE id = v_item.id;
    END LOOP;

    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = v_order.id) THEN
      UPDATE orders SET status = 'em_producao' WHERE id = v_order.id;
    END IF;
  END LOOP;
END;
$$;
