-- =====================================================
-- FASE 1: Corrigir fases iniciais duplicadas
-- Garantir apenas 1 is_start_phase = true por tipo de produção
-- =====================================================

-- Produção Tendenci: manter "Aguardando" como inicial
UPDATE production_phase_templates
SET is_start_phase = false
WHERE production_type_id = (
  SELECT id FROM production_types WHERE name = 'Produção Tendenci' LIMIT 1
)
AND name != 'Aguardando'
AND is_start_phase = true;

-- Revenda: manter "Aguardando Compra" como inicial
UPDATE production_phase_templates
SET is_start_phase = false
WHERE production_type_id = (
  SELECT id FROM production_types WHERE name = 'Revenda' LIMIT 1
)
AND name != 'Aguardando Compra'
AND is_start_phase = true;

-- Móveis Planejados: manter "Aguardando" como inicial
UPDATE production_phase_templates
SET is_start_phase = false
WHERE production_type_id = (
  SELECT id FROM production_types WHERE name = 'Móveis Planejados' LIMIT 1
)
AND name != 'Aguardando'
AND is_start_phase = true;

-- =====================================================
-- FASE 2: Criar função de automação Pedido → Produção
-- =====================================================

CREATE OR REPLACE FUNCTION create_production_on_order_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_production_type_id UUID;
  v_production_type_name TEXT;
  v_start_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
BEGIN
  -- Só processa quando status muda para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    -- Verificar se já existe OP para este pedido
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Mapear centro_custo para production_type
    CASE NEW.centro_custo
      WHEN 'moveis_planejados' THEN
        SELECT id, name INTO v_production_type_id, v_production_type_name
        FROM production_types WHERE name = 'Móveis Planejados' AND active = true LIMIT 1;
      WHEN 'producao_tendenci' THEN
        SELECT id, name INTO v_production_type_id, v_production_type_name
        FROM production_types WHERE name = 'Produção Tendenci' AND active = true LIMIT 1;
      WHEN 'revenda' THEN
        SELECT id, name INTO v_production_type_id, v_production_type_name
        FROM production_types WHERE name = 'Revenda' AND active = true LIMIT 1;
      ELSE
        -- Centro de custo não mapeado - não criar OP automaticamente
        RETURN NEW;
    END CASE;
    
    -- Se não encontrou tipo de produção, sair
    IF v_production_type_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Buscar fase inicial do tipo de produção
    SELECT id INTO v_start_phase_id
    FROM production_phase_templates
    WHERE production_type_id = v_production_type_id
      AND is_start_phase = true
    ORDER BY position ASC
    LIMIT 1;
    
    -- Se não tem fase inicial, pegar a primeira pelo position
    IF v_start_phase_id IS NULL THEN
      SELECT id INTO v_start_phase_id
      FROM production_phase_templates
      WHERE production_type_id = v_production_type_id
      ORDER BY position ASC
      LIMIT 1;
    END IF;
    
    -- Buscar nome do cliente
    SELECT name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;
    
    -- Criar a ordem de produção
    INSERT INTO production_orders (
      title,
      client_id,
      deal_id,
      order_id,
      production_type_id,
      value,
      status,
      priority,
      created_by
    )
    VALUES (
      'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente'),
      NEW.client_id,
      NEW.deal_id,
      NEW.id,
      v_production_type_id,
      NEW.valor_total,
      'aguardando',
      'normal',
      NEW.approved_by
    )
    RETURNING id INTO v_new_op_id;
    
    -- Atualizar status do pedido para em_producao
    NEW.status := 'em_producao';
    
    -- Registrar no histórico
    INSERT INTO order_history (
      order_id,
      action_type,
      field_name,
      old_value,
      new_value,
      description,
      created_by
    )
    VALUES (
      NEW.id,
      'production_created',
      'status',
      'aprovado',
      'em_producao',
      'Ordem de produção criada automaticamente no kanban ' || v_production_type_name,
      NEW.approved_by
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que dispara ANTES do update (para poder modificar NEW.status)
DROP TRIGGER IF EXISTS trigger_create_production_on_order_approval ON orders;
CREATE TRIGGER trigger_create_production_on_order_approval
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_production_on_order_approval();

-- =====================================================
-- FASE 3: Adicionar coluna order_id em production_orders se não existir
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_orders' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
    CREATE INDEX idx_production_orders_order_id ON production_orders(order_id);
  END IF;
END $$;