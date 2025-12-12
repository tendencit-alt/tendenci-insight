-- ============================================
-- FASE 1: Pagamento fracionado em orders
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS forma_pagamento_2 VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS percentual_forma_1 NUMERIC DEFAULT 100;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS percentual_forma_2 NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS observacao_pagamento TEXT;

-- ============================================
-- FASE 2: Campos abertos de produto
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS cor TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS medida TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fornecedor_texto TEXT;

-- ============================================
-- FASE 3: Tipos de produção distintos
-- ============================================
INSERT INTO production_types (name, slug, color, position, active) VALUES
('Móveis Planejados', 'moveis-planejados', 'blue-500', 1, true),
('Móveis Produção - Náutico', 'moveis-producao-nautico', 'cyan-500', 2, true),
('Móveis Produção - Rústico', 'moveis-producao-rustico', 'amber-500', 3, true),
('Móveis Produção - Industrial', 'moveis-producao-industrial', 'gray-600', 4, true),
('Móveis Produção - Quadro', 'moveis-producao-quadro', 'purple-500', 5, true),
('Móveis Revenda', 'moveis-revenda', 'green-500', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FASE 4: SLA em dias úteis e previsão
-- ============================================
ALTER TABLE production_phase_templates ADD COLUMN IF NOT EXISTS sla_dias_uteis INTEGER;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS prazo_customizado_dias INTEGER;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS previsao_final_calculada TIMESTAMP WITH TIME ZONE;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS alerta_atraso TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS etapa_prevista_atraso TEXT;

-- ============================================
-- FASE 5: RPC de análise preditiva de atrasos
-- ============================================
CREATE OR REPLACE FUNCTION calcular_previsao_atraso_producao(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_order RECORD;
  v_total_sla_hours INTEGER;
  v_total_sla_dias INTEGER;
  v_avg_real_hours NUMERIC;
  v_current_phase RECORD;
  v_hours_in_phase NUMERIC;
  v_phase_sla_hours INTEGER;
  v_previsao_atraso BOOLEAN := false;
  v_etapa_atraso TEXT := null;
BEGIN
  -- Buscar ordem
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN json_build_object('error', 'Ordem não encontrada');
  END IF;
  
  -- Calcular SLA total das fases em horas
  SELECT COALESCE(SUM(COALESCE(sla_hours, 0)), 0), COALESCE(SUM(COALESCE(sla_dias_uteis, 0)), 0)
  INTO v_total_sla_hours, v_total_sla_dias
  FROM production_phase_templates
  WHERE production_type_id = v_order.production_type_id;
  
  -- Verificar fase atual
  IF v_order.current_phase_id IS NOT NULL THEN
    SELECT ppt.name, ppt.sla_hours, ppt.sla_dias_uteis, pp.started_at
    INTO v_current_phase
    FROM production_phases pp
    JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
    WHERE pp.id = v_order.current_phase_id;
    
    IF v_current_phase.started_at IS NOT NULL THEN
      v_hours_in_phase := EXTRACT(EPOCH FROM (NOW() - v_current_phase.started_at)) / 3600;
      v_phase_sla_hours := COALESCE(v_current_phase.sla_hours, COALESCE(v_current_phase.sla_dias_uteis, 0) * 8);
      
      IF v_hours_in_phase > v_phase_sla_hours AND v_phase_sla_hours > 0 THEN
        v_previsao_atraso := true;
        v_etapa_atraso := v_current_phase.name;
      END IF;
    END IF;
  END IF;
  
  -- Calcular média real de horas por ordens similares finalizadas
  SELECT AVG(EXTRACT(EPOCH FROM (actual_end_date - actual_start_date)) / 3600) INTO v_avg_real_hours
  FROM production_orders
  WHERE production_type_id = v_order.production_type_id
    AND status = 'concluido'
    AND actual_start_date IS NOT NULL
    AND actual_end_date IS NOT NULL;
  
  -- Calcular previsão final
  v_result := json_build_object(
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'sla_total_hours', v_total_sla_hours + (v_total_sla_dias * 8),
    'sla_total_dias', v_total_sla_dias + (v_total_sla_hours / 8),
    'avg_real_hours', COALESCE(v_avg_real_hours, v_total_sla_hours + (v_total_sla_dias * 8)),
    'previsao_atraso', v_previsao_atraso,
    'etapa_prevista_atraso', v_etapa_atraso,
    'horas_estimadas_extra', GREATEST(0, COALESCE(v_avg_real_hours, 0) - (v_total_sla_hours + (v_total_sla_dias * 8))),
    'previsao_conclusao', CASE 
      WHEN v_order.planned_start_date IS NOT NULL THEN 
        v_order.planned_start_date + INTERVAL '1 hour' * (v_total_sla_hours + (v_total_sla_dias * 8))
      ELSE 
        v_order.created_at + INTERVAL '1 hour' * (v_total_sla_hours + (v_total_sla_dias * 8))
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FASE 4: RPC para alertas de SLA de produção
-- ============================================
CREATE OR REPLACE FUNCTION production_sla_alerts(p_type_id UUID DEFAULT NULL)
RETURNS TABLE(
  order_id UUID,
  order_number INTEGER,
  title TEXT,
  priority TEXT,
  alert_type TEXT,
  phase_name TEXT,
  hours_overdue NUMERIC,
  planned_end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH phase_alerts AS (
    -- Alertas de SLA de fase estourado
    SELECT 
      po.id as order_id,
      po.order_number,
      po.title,
      po.priority,
      'sla_estourado'::TEXT as alert_type,
      ppt.name as phase_name,
      EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 - COALESCE(ppt.sla_hours, COALESCE(ppt.sla_dias_uteis, 0) * 8) as hours_overdue,
      po.planned_end_date
    FROM production_orders po
    JOIN production_phases pp ON pp.id = po.current_phase_id
    JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
    WHERE po.status NOT IN ('concluido', 'cancelado')
      AND pp.started_at IS NOT NULL
      AND (ppt.sla_hours > 0 OR ppt.sla_dias_uteis > 0)
      AND EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 > COALESCE(ppt.sla_hours, COALESCE(ppt.sla_dias_uteis, 0) * 8)
      AND (p_type_id IS NULL OR po.production_type_id = p_type_id)
  ),
  deadline_alerts AS (
    -- Alertas de prazo final vencido
    SELECT 
      po.id as order_id,
      po.order_number,
      po.title,
      po.priority,
      'prazo_vencido'::TEXT as alert_type,
      NULL::TEXT as phase_name,
      EXTRACT(EPOCH FROM (NOW() - po.planned_end_date)) / 3600 as hours_overdue,
      po.planned_end_date
    FROM production_orders po
    WHERE po.status NOT IN ('concluido', 'cancelado')
      AND po.planned_end_date IS NOT NULL
      AND po.planned_end_date < NOW()
      AND (p_type_id IS NULL OR po.production_type_id = p_type_id)
  ),
  upcoming_alerts AS (
    -- Alertas de prazo próximo (3 dias)
    SELECT 
      po.id as order_id,
      po.order_number,
      po.title,
      po.priority,
      'prazo_proximo'::TEXT as alert_type,
      NULL::TEXT as phase_name,
      EXTRACT(EPOCH FROM (po.planned_end_date - NOW())) / 3600 as hours_overdue,
      po.planned_end_date
    FROM production_orders po
    WHERE po.status NOT IN ('concluido', 'cancelado')
      AND po.planned_end_date IS NOT NULL
      AND po.planned_end_date > NOW()
      AND po.planned_end_date <= NOW() + INTERVAL '3 days'
      AND (p_type_id IS NULL OR po.production_type_id = p_type_id)
  )
  SELECT * FROM phase_alerts
  UNION ALL
  SELECT * FROM deadline_alerts
  UNION ALL
  SELECT * FROM upcoming_alerts
  ORDER BY hours_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FASE 6: Fases padrão para tipos de produção
-- ============================================

-- Fases para Móveis Produção (todos os subtipos)
INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Aguardando', 'aguardando', 'gray-500', 1, 24, 1, true, false 
FROM production_types pt WHERE pt.slug LIKE 'moveis-producao%'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Compra de Material', 'compra-material', 'yellow-500', 2, 48, 2, false, false 
FROM production_types pt WHERE pt.slug LIKE 'moveis-producao%'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Produção Iniciada', 'producao-iniciada', 'blue-500', 3, 120, 5, false, false 
FROM production_types pt WHERE pt.slug LIKE 'moveis-producao%'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Produto Finalizado', 'produto-finalizado', 'green-500', 4, 24, 1, false, false 
FROM production_types pt WHERE pt.slug LIKE 'moveis-producao%'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Entregue', 'entregue', 'emerald-500', 5, 0, 0, false, true 
FROM production_types pt WHERE pt.slug LIKE 'moveis-producao%'
ON CONFLICT DO NOTHING;

-- Fases para Móveis Revenda
INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Aguardando Compra', 'aguardando-compra', 'gray-500', 1, 24, 1, true, false 
FROM production_types pt WHERE pt.slug = 'moveis-revenda'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Aguardando Entrega', 'aguardando-entrega', 'yellow-500', 2, 168, 7, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-revenda'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Recebido Tendenci', 'recebido-tendenci', 'blue-500', 3, 24, 1, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-revenda'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Entrega Cliente', 'entrega-cliente', 'emerald-500', 4, 48, 2, false, true 
FROM production_types pt WHERE pt.slug = 'moveis-revenda'
ON CONFLICT DO NOTHING;

-- Fases para Móveis Planejados
INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Projeto', 'projeto', 'purple-500', 1, 48, 2, true, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Aprovação Cliente', 'aprovacao-cliente', 'yellow-500', 2, 72, 3, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Compra de Material', 'compra-material', 'orange-500', 3, 48, 2, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Produção', 'producao', 'blue-500', 4, 240, 10, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Acabamento', 'acabamento', 'cyan-500', 5, 48, 2, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Instalação', 'instalacao', 'green-500', 6, 24, 1, false, false 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;

INSERT INTO production_phase_templates (production_type_id, name, slug, color, position, sla_hours, sla_dias_uteis, is_start_phase, is_end_phase)
SELECT pt.id, 'Entregue', 'entregue', 'emerald-500', 7, 0, 0, false, true 
FROM production_types pt WHERE pt.slug = 'moveis-planejados'
ON CONFLICT DO NOTHING;