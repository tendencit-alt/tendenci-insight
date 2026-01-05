
-- Corrigir a trigger existente que tem bug com tipo UUID
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template RECORD;
  v_first_phase_id UUID := NULL;
  v_is_first_phase BOOLEAN := TRUE;
BEGIN
  -- Criar fases baseadas nos templates do tipo de produção
  FOR v_template IN
    SELECT id, name, position
    FROM production_phase_templates
    WHERE production_type_id = NEW.production_type_id
      AND active = true
    ORDER BY position ASC
  LOOP
    INSERT INTO production_phases (
      production_order_id,
      phase_template_id,
      status,
      started_at
    )
    VALUES (
      NEW.id,
      v_template.id,
      CASE WHEN v_is_first_phase THEN 'em_andamento' ELSE 'pendente' END,
      CASE WHEN v_is_first_phase THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_first_phase_id;
    
    -- Guardar apenas a primeira fase
    IF v_is_first_phase AND NEW.current_phase_id IS NULL THEN
      -- Atualizar a ordem com a primeira fase
      UPDATE production_orders 
      SET current_phase_id = v_first_phase_id
      WHERE id = NEW.id;
      
      -- Marcar que já processou a primeira fase
      v_is_first_phase := FALSE;
    END IF;
  END LOOP;
  
  -- Calcular e definir prazo de entrega baseado nos SLAs (apenas se não tiver prazo manual)
  UPDATE production_orders 
  SET planned_end_date = calculate_production_deadline(NEW.production_type_id, NEW.created_at)
  WHERE id = NEW.id
    AND planned_end_date IS NULL;
  
  RETURN NEW;
END;
$function$;

-- Agora criar a OP para o item da Adriana (pedido #20)
DO $$
DECLARE
  v_order_id UUID;
  v_item_id UUID;
  v_production_type_id UUID;
  v_client_id UUID;
  v_deal_id UUID;
  v_order_number INT;
  v_item_descricao TEXT;
  v_item_valor NUMERIC;
  v_new_op_id UUID;
BEGIN
  -- Buscar dados do pedido #20
  SELECT o.id, o.client_id, o.deal_id, o.order_number
  INTO v_order_id, v_client_id, v_deal_id, v_order_number
  FROM orders o
  WHERE o.order_number = 20;
  
  IF v_order_id IS NULL THEN
    RAISE NOTICE 'Pedido #20 não encontrado';
    RETURN;
  END IF;
  
  -- Buscar item com centro_custo moveis_planejados sem OP
  SELECT oi.id, oi.descricao, oi.valor_total
  INTO v_item_id, v_item_descricao, v_item_valor
  FROM order_items oi
  WHERE oi.order_id = v_order_id
    AND oi.centro_custo = 'moveis_planejados'
    AND oi.production_order_id IS NULL
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    RAISE NOTICE 'Item não encontrado ou já tem OP vinculada';
    RETURN;
  END IF;
  
  -- Buscar tipo de produção Móveis Planejados
  SELECT pt.id INTO v_production_type_id
  FROM production_types pt
  WHERE pt.name = 'Móveis Planejados' AND pt.active = true;
  
  IF v_production_type_id IS NULL THEN
    RAISE NOTICE 'Tipo de produção Móveis Planejados não encontrado';
    RETURN;
  END IF;
  
  -- Criar OP (a trigger create_production_phases_on_op_insert vai criar as fases automaticamente)
  INSERT INTO production_orders (
    title, production_type_id, deal_id, client_id, 
    order_id, order_item_id, value, status, priority
  ) VALUES (
    COALESCE(v_item_descricao, 'Item') || ' - Pedido #' || v_order_number,
    v_production_type_id,
    v_deal_id,
    v_client_id,
    v_order_id,
    v_item_id,
    v_item_valor,
    'aguardando',
    'normal'
  )
  RETURNING id INTO v_new_op_id;
  
  -- Vincular item à OP
  UPDATE order_items SET production_order_id = v_new_op_id WHERE id = v_item_id;
  
  RAISE NOTICE 'OP criada com sucesso: %', v_new_op_id;
END $$;
