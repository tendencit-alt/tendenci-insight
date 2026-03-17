
-- Update production trigger to dynamically match centro_custo to production_types
CREATE OR REPLACE FUNCTION public.create_production_on_order_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_production_type_id UUID;
  v_production_type_name TEXT;
  v_start_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_item RECORD;
BEGIN
  -- Só processa quando status muda para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    -- Verificar se já existe OP para este pedido
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Buscar nome do cliente
    SELECT name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;

    -- Iterar sobre itens do pedido agrupados por centro_custo
    FOR v_item IN 
      SELECT DISTINCT centro_custo 
      FROM order_items 
      WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      -- Buscar production_type pelo nome usando ILIKE para match flexível
      SELECT id, name INTO v_production_type_id, v_production_type_name
      FROM production_types 
      WHERE active = true 
        AND (
          name ILIKE '%' || v_item.centro_custo || '%'
          OR v_item.centro_custo ILIKE '%' || name || '%'
        )
      LIMIT 1;

      -- Fallback: tentar match pelo centro_custo do pedido principal (legado)
      IF v_production_type_id IS NULL AND NEW.centro_custo IS NOT NULL THEN
        CASE NEW.centro_custo
          WHEN 'moveis_planejados' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%planejados%' AND active = true LIMIT 1;
          WHEN 'producao_tendenci' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%tendenci%' AND active = true LIMIT 1;
          WHEN 'revenda' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%revenda%' AND active = true LIMIT 1;
          ELSE
            NULL;
        END CASE;
      END IF;

      IF v_production_type_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Verificar se já existe OP para este pedido + tipo de produção
      IF EXISTS (
        SELECT 1 FROM production_orders 
        WHERE order_id = NEW.id AND production_type_id = v_production_type_id
      ) THEN
        CONTINUE;
      END IF;
    
      -- Buscar fase inicial do tipo de produção
      SELECT id INTO v_start_phase_id
      FROM production_phase_templates
      WHERE production_type_id = v_production_type_id
        AND is_start_phase = true
      ORDER BY position ASC
      LIMIT 1;
      
      IF v_start_phase_id IS NULL THEN
        SELECT id INTO v_start_phase_id
        FROM production_phase_templates
        WHERE production_type_id = v_production_type_id
        ORDER BY position ASC
        LIMIT 1;
      END IF;
      
      -- Criar a ordem de produção
      INSERT INTO production_orders (
        title, client_id, deal_id, order_id, production_type_id,
        value, status, priority, created_by
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente'),
        NEW.client_id, NEW.deal_id, NEW.id, v_production_type_id,
        NEW.valor_total, 'aguardando', 'normal', NEW.approved_by
      ) RETURNING id INTO v_new_op_id;

    END LOOP;
    
    -- Atualizar status do pedido para em_producao
    NEW.status := 'em_producao';
    
    -- Registrar no histórico
    INSERT INTO order_history (
      order_id, action_type, field_name, old_value, new_value,
      description, created_by
    ) VALUES (
      NEW.id, 'production_created', 'status', 'aprovado', 'em_producao',
      'Ordem(ns) de produção criada(s) automaticamente',
      NEW.approved_by
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
