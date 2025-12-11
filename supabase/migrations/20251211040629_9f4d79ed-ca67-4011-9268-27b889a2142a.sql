-- RPC para métricas gerais de produção
CREATE OR REPLACE FUNCTION production_metrics(
  p_type_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'aguardando', COUNT(*) FILTER (WHERE status = 'aguardando'),
    'em_andamento', COUNT(*) FILTER (WHERE status = 'em_andamento'),
    'concluido', COUNT(*) FILTER (WHERE status = 'concluido'),
    'pausado', COUNT(*) FILTER (WHERE status = 'pausado'),
    'cancelado', COUNT(*) FILTER (WHERE status = 'cancelado'),
    'valor_total', COALESCE(SUM(value), 0),
    'valor_aguardando', COALESCE(SUM(value) FILTER (WHERE status = 'aguardando'), 0),
    'valor_em_andamento', COALESCE(SUM(value) FILTER (WHERE status = 'em_andamento'), 0),
    'valor_concluido', COALESCE(SUM(value) FILTER (WHERE status = 'concluido'), 0),
    'atrasadas_prazo', COUNT(*) FILTER (
      WHERE planned_end_date < NOW() 
      AND status NOT IN ('concluido', 'cancelado')
    ),
    'urgente', COUNT(*) FILTER (WHERE priority = 'urgente'),
    'alta', COUNT(*) FILTER (WHERE priority = 'alta'),
    'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
    'baixa', COUNT(*) FILTER (WHERE priority = 'baixa'),
    'concluidas_no_prazo', COUNT(*) FILTER (
      WHERE status = 'concluido' 
      AND (actual_end_date IS NULL OR planned_end_date IS NULL OR actual_end_date <= planned_end_date)
    ),
    'total_concluidas', COUNT(*) FILTER (WHERE status = 'concluido')
  ) INTO result
  FROM production_orders
  WHERE (p_type_id IS NULL OR production_type_id = p_type_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);
  
  RETURN result;
END;
$$;

-- RPC para métricas de SLA por fase
CREATE OR REPLACE FUNCTION production_sla_metrics(p_type_id UUID DEFAULT NULL)
RETURNS TABLE (
  phase_name TEXT,
  phase_color TEXT,
  total_orders BIGINT,
  avg_hours NUMERIC,
  sla_hours INTEGER,
  sla_violations BIGINT,
  in_progress BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ppt.name::TEXT,
    ppt.color::TEXT,
    COUNT(pp.id),
    ROUND(AVG(
      CASE WHEN pp.completed_at IS NOT NULL AND pp.started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600 
      ELSE NULL END
    )::NUMERIC, 1),
    ppt.sla_hours,
    COUNT(*) FILTER (
      WHERE pp.started_at IS NOT NULL 
      AND ppt.sla_hours IS NOT NULL
      AND (
        (pp.completed_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 > ppt.sla_hours)
        OR (pp.completed_at IS NOT NULL AND EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600 > ppt.sla_hours)
      )
    ),
    COUNT(*) FILTER (WHERE pp.status = 'em_andamento')
  FROM production_phase_templates ppt
  LEFT JOIN production_phases pp ON pp.phase_template_id = ppt.id
  LEFT JOIN production_orders po ON pp.production_order_id = po.id
  WHERE ppt.active = true
    AND (p_type_id IS NULL OR ppt.production_type_id = p_type_id)
  GROUP BY ppt.id, ppt.name, ppt.color, ppt.sla_hours, ppt.position
  ORDER BY ppt.position;
END;
$$;

-- RPC para obter OPs com alertas de SLA
CREATE OR REPLACE FUNCTION production_sla_alerts(p_type_id UUID DEFAULT NULL)
RETURNS TABLE (
  order_id UUID,
  order_number INTEGER,
  title TEXT,
  priority TEXT,
  alert_type TEXT,
  phase_name TEXT,
  hours_overdue NUMERIC,
  planned_end_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- OPs com prazo vencido
  RETURN QUERY
  SELECT 
    po.id,
    po.order_number,
    po.title,
    po.priority,
    'prazo_vencido'::TEXT,
    ppt.name,
    ROUND(EXTRACT(EPOCH FROM (NOW() - po.planned_end_date)) / 3600, 1),
    po.planned_end_date
  FROM production_orders po
  LEFT JOIN production_phases pp ON pp.id = po.current_phase_id
  LEFT JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
  WHERE po.planned_end_date < NOW()
    AND po.status NOT IN ('concluido', 'cancelado')
    AND (p_type_id IS NULL OR po.production_type_id = p_type_id);

  -- OPs com fase estourando SLA
  RETURN QUERY
  SELECT 
    po.id,
    po.order_number,
    po.title,
    po.priority,
    'sla_estourado'::TEXT,
    ppt.name,
    ROUND(EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 - ppt.sla_hours, 1),
    po.planned_end_date
  FROM production_orders po
  JOIN production_phases pp ON pp.id = po.current_phase_id
  JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
  WHERE pp.started_at IS NOT NULL
    AND pp.completed_at IS NULL
    AND ppt.sla_hours IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 > ppt.sla_hours
    AND po.status NOT IN ('concluido', 'cancelado')
    AND (p_type_id IS NULL OR po.production_type_id = p_type_id);

  -- OPs próximas do prazo (3 dias)
  RETURN QUERY
  SELECT 
    po.id,
    po.order_number,
    po.title,
    po.priority,
    'prazo_proximo'::TEXT,
    ppt.name,
    ROUND(EXTRACT(EPOCH FROM (po.planned_end_date - NOW())) / 3600, 1),
    po.planned_end_date
  FROM production_orders po
  LEFT JOIN production_phases pp ON pp.id = po.current_phase_id
  LEFT JOIN production_phase_templates ppt ON ppt.id = pp.phase_template_id
  WHERE po.planned_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    AND po.status NOT IN ('concluido', 'cancelado')
    AND (p_type_id IS NULL OR po.production_type_id = p_type_id);
END;
$$;