-- 1. Adicionar FK de production_orders.deal_id para crm_deals.id (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_production_orders_crm_deal'
    AND table_name = 'production_orders'
  ) THEN
    ALTER TABLE production_orders 
    ADD CONSTRAINT fk_production_orders_crm_deal 
    FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Atualizar fases "em_andamento" sem started_at para usar created_at como fallback
UPDATE production_phases
SET started_at = created_at
WHERE status = 'em_andamento' AND started_at IS NULL;

-- 3. Atualizar o trigger para definir started_at quando status = em_andamento
CREATE OR REPLACE FUNCTION create_production_phases_on_op_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template RECORD;
  v_first_phase_id UUID;
BEGIN
  -- Criar instâncias de fases baseadas nos templates do tipo de produção
  FOR v_template IN 
    SELECT id, position, is_start_phase 
    FROM production_phase_templates 
    WHERE production_type_id = NEW.production_type_id AND active = true
    ORDER BY position ASC
  LOOP
    INSERT INTO production_phases (
      production_order_id, 
      phase_template_id, 
      position,
      status,
      started_at  -- Define started_at para primeira fase
    ) VALUES (
      NEW.id, 
      v_template.id, 
      v_template.position,
      CASE WHEN v_template.is_start_phase THEN 'em_andamento' ELSE 'pendente' END,
      CASE WHEN v_template.is_start_phase THEN NOW() ELSE NULL END  -- started_at = NOW() se for primeira fase
    )
    RETURNING id INTO v_first_phase_id;
    
    -- Guardar o ID da primeira fase para definir como current_phase_id
    IF v_template.is_start_phase THEN
      UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = NEW.id;
    END IF;
  END LOOP;
  
  -- Log de criação
  INSERT INTO production_logs (production_order_id, action_type, description, created_by)
  VALUES (NEW.id, 'created', 'Ordem de Produção criada: ' || NEW.title, NEW.created_by);
  
  RETURN NEW;
END;
$$;

-- 4. Criar/Atualizar RPC production_metrics para aceitar filtros
CREATE OR REPLACE FUNCTION production_metrics(
  p_type_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_responsible_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'aguardando', COUNT(*) FILTER (WHERE po.status = 'aguardando'),
    'em_andamento', COUNT(*) FILTER (WHERE po.status = 'em_andamento'),
    'concluido', COUNT(*) FILTER (WHERE po.status = 'concluido'),
    'pausado', COUNT(*) FILTER (WHERE po.status = 'pausado'),
    'cancelado', COUNT(*) FILTER (WHERE po.status = 'cancelado'),
    'valor_total', COALESCE(SUM(po.value), 0),
    'valor_aguardando', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'aguardando'), 0),
    'valor_em_andamento', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'em_andamento'), 0),
    'valor_concluido', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'concluido'), 0),
    'atrasadas_prazo', COUNT(*) FILTER (WHERE po.planned_end_date < NOW() AND po.status NOT IN ('concluido', 'cancelado')),
    'urgente', COUNT(*) FILTER (WHERE po.priority = 'urgente' AND po.status NOT IN ('concluido', 'cancelado')),
    'alta', COUNT(*) FILTER (WHERE po.priority = 'alta' AND po.status NOT IN ('concluido', 'cancelado')),
    'normal', COUNT(*) FILTER (WHERE po.priority = 'normal' AND po.status NOT IN ('concluido', 'cancelado')),
    'baixa', COUNT(*) FILTER (WHERE po.priority = 'baixa' AND po.status NOT IN ('concluido', 'cancelado')),
    'concluidas_no_prazo', COUNT(*) FILTER (WHERE po.status = 'concluido' AND (po.actual_end_date IS NULL OR po.actual_end_date <= po.planned_end_date)),
    'total_concluidas', COUNT(*) FILTER (WHERE po.status = 'concluido')
  ) INTO v_result
  FROM production_orders po
  WHERE (p_type_id IS NULL OR po.production_type_id = p_type_id)
    AND (p_status IS NULL OR p_status = 'all' OR po.status = p_status)
    AND (p_priority IS NULL OR p_priority = 'all' OR po.priority = p_priority)
    AND (p_responsible_id IS NULL OR po.responsible_id = p_responsible_id)
    AND (p_date_from IS NULL OR po.created_at >= p_date_from)
    AND (p_date_to IS NULL OR po.created_at <= p_date_to);
  
  RETURN v_result;
END;
$$;