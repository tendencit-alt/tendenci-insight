-- 1. Atualizar a trigger para usar prazo do pedido quando OP é criada a partir de um pedido
CREATE OR REPLACE FUNCTION create_production_orders_on_activation()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  production_type_id UUID;
  first_phase_id UUID;
  new_op_id UUID;
BEGIN
  IF NEW.status = 'ativo' AND (OLD.status IS NULL OR OLD.status != 'ativo') THEN
    
    FOR item IN 
      SELECT oi.id, oi.descricao, oi.centro_custo, oi.valor_total, oi.production_order_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      IF item.production_order_id IS NOT NULL OR item.centro_custo IS NULL THEN
        CONTINUE;
      END IF;
      
      SELECT pt.id INTO production_type_id
      FROM production_types pt
      WHERE pt.active = true
        AND (
          (item.centro_custo = 'moveis_planejados' AND pt.name = 'Móveis Planejados') OR
          (item.centro_custo = 'producao_tendenci' AND pt.name = 'Produção Tendenci') OR
          (item.centro_custo = 'revenda' AND pt.name = 'Revenda')
        )
      LIMIT 1;
      
      IF production_type_id IS NULL THEN
        CONTINUE;
      END IF;
      
      -- CORREÇÃO: Usar planned_end_date do pedido (data_entrega_prevista) quando existir
      INSERT INTO production_orders (
        title,
        production_type_id,
        deal_id,
        client_id,
        order_id,
        order_item_id,
        value,
        status,
        priority,
        planned_end_date
      ) VALUES (
        COALESCE(item.descricao, 'Item do Pedido #' || NEW.order_number),
        production_type_id,
        NEW.deal_id,
        NEW.client_id,
        NEW.id,
        item.id,
        item.valor_total,
        'aguardando',
        'normal',
        NEW.data_entrega_prevista::timestamptz  -- Usa prazo do pedido
      )
      RETURNING id INTO new_op_id;
      
      -- Buscar primeira fase
      SELECT ppt.id INTO first_phase_id
      FROM production_phase_templates ppt
      WHERE ppt.production_type_id = production_type_id
        AND ppt.active = true
      ORDER BY ppt.position
      LIMIT 1;
      
      IF first_phase_id IS NOT NULL AND new_op_id IS NOT NULL THEN
        INSERT INTO production_phases (
          production_order_id,
          phase_template_id,
          status,
          started_at
        ) VALUES (
          new_op_id,
          first_phase_id,
          'em_andamento',
          NOW()
        );
        
        -- Atualizar current_phase_id sem disparar trigger de recálculo
        UPDATE production_orders
        SET current_phase_id = (
          SELECT id FROM production_phases 
          WHERE production_order_id = new_op_id 
          LIMIT 1
        )
        WHERE id = new_op_id;
      END IF;
      
      UPDATE order_items
      SET production_order_id = new_op_id
      WHERE id = item.id;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Modificar a trigger de fases para NÃO sobrescrever prazo existente
CREATE OR REPLACE FUNCTION create_production_phases_on_op_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_first_phase_template RECORD;
  v_new_phase_id uuid;
BEGIN
  IF NEW.production_type_id IS NOT NULL AND NEW.current_phase_id IS NULL THEN
    SELECT id, name INTO v_first_phase_template
    FROM production_phase_templates
    WHERE production_type_id = NEW.production_type_id
      AND active = true
    ORDER BY position ASC
    LIMIT 1;
    
    IF v_first_phase_template.id IS NOT NULL THEN
      INSERT INTO production_phases (
        production_order_id,
        phase_template_id,
        status,
        started_at
      ) VALUES (
        NEW.id,
        v_first_phase_template.id,
        'em_andamento',
        NOW()
      )
      RETURNING id INTO v_new_phase_id;
      
      -- Só atualiza current_phase_id, NÃO mexe no planned_end_date
      UPDATE production_orders 
      SET current_phase_id = v_new_phase_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- Só calcular prazo se não houver prazo definido (OPs manuais sem prazo)
  IF NEW.planned_end_date IS NULL AND NEW.production_type_id IS NOT NULL THEN
    UPDATE production_orders 
    SET planned_end_date = calculate_production_deadline(NEW.production_type_id, NEW.created_at)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Corrigir o prazo da OP do pedido #20 (e outras OPs com prazo incorreto)
-- Atualizar todas as OPs que vieram de pedidos para usar o prazo do pedido
UPDATE production_orders po
SET planned_end_date = o.data_entrega_prevista::timestamptz
FROM orders o
WHERE po.order_id = o.id
  AND o.data_entrega_prevista IS NOT NULL
  AND po.prazo_customizado_dias IS NULL;