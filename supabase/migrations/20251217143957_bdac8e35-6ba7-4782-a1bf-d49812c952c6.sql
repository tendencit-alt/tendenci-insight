-- Função para calcular métricas de projetos baseadas no histórico de movimentação
CREATE OR REPLACE FUNCTION projects_metrics_by_history(
  p_stages TEXT[] DEFAULT NULL,
  p_architect_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_filter_by_deadline BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  recebido_count BIGINT,
  em_orcamento_count BIGINT,
  orcado_count BIGINT,
  apresentado_count BIGINT,
  em_negociacao_count BIGINT,
  aprovado_count BIGINT,
  aprovado_value NUMERIC,
  perdido_count BIGINT,
  near_due_count BIGINT,
  overdue_count BIGINT,
  total_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recebido BIGINT := 0;
  v_em_orcamento BIGINT := 0;
  v_orcado BIGINT := 0;
  v_apresentado BIGINT := 0;
  v_em_negociacao BIGINT := 0;
  v_aprovado BIGINT := 0;
  v_aprovado_value NUMERIC := 0;
  v_perdido BIGINT := 0;
  v_near_due BIGINT := 0;
  v_overdue BIGINT := 0;
  v_total_value NUMERIC := 0;
BEGIN
  -- Contar projetos que ENTRARAM em cada etapa durante o período
  -- Usando project_history para rastrear transições de estágio
  
  WITH stage_transitions AS (
    SELECT 
      ph.project_id,
      ph.created_at,
      CASE 
        -- Extrai estágio destino de "Estágio alterado de X para Y"
        WHEN ph.description LIKE 'Estágio alterado%para%' THEN
          LOWER(TRIM(REGEXP_REPLACE(
            SPLIT_PART(ph.description, 'para "', 2),
            '".*$', ''
          )))
        -- Extrai estágio de "Projeto criado no estágio: X"
        WHEN ph.description LIKE 'Projeto criado no estágio:%' THEN
          LOWER(TRIM(REPLACE(ph.description, 'Projeto criado no estágio: ', '')))
        -- Extrai estágio de "Projeto recebido"
        WHEN ph.description = 'Projeto recebido' THEN
          'recebido'
        ELSE NULL
      END AS target_stage,
      p.architect_id,
      p.value,
      p.deadline
    FROM project_history ph
    INNER JOIN projects p ON p.id = ph.project_id
    WHERE ph.event_type IN ('status', 'sistema')
      -- Filtro de período
      AND (p_date_from IS NULL OR ph.created_at >= p_date_from)
      AND (p_date_to IS NULL OR ph.created_at <= p_date_to)
      -- Filtro de arquiteto
      AND (
        p_architect_id IS NULL 
        OR (p_architect_id = '00000000-0000-0000-0000-000000000000' AND p.architect_id IS NULL)
        OR p.architect_id = p_architect_id
      )
      -- Filtro por deadline
      AND (p_filter_by_deadline = FALSE OR p.deadline IS NOT NULL)
  )
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'recebido'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'em_orcamento'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'orcado'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'apresentado'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'em_negociacao'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'aprovado'), 0),
    COALESCE(SUM(value) FILTER (WHERE target_stage = 'aprovado'), 0),
    COALESCE(COUNT(*) FILTER (WHERE target_stage = 'perdido'), 0)
  INTO v_recebido, v_em_orcamento, v_orcado, v_apresentado, v_em_negociacao, v_aprovado, v_aprovado_value, v_perdido
  FROM stage_transitions
  WHERE target_stage IS NOT NULL;

  -- Calcular valor total dos projetos que entraram em qualquer etapa no período
  SELECT COALESCE(SUM(DISTINCT p.value), 0)
  INTO v_total_value
  FROM project_history ph
  INNER JOIN projects p ON p.id = ph.project_id
  WHERE ph.event_type IN ('status', 'sistema')
    AND (p_date_from IS NULL OR ph.created_at >= p_date_from)
    AND (p_date_to IS NULL OR ph.created_at <= p_date_to)
    AND (
      p_architect_id IS NULL 
      OR (p_architect_id = '00000000-0000-0000-0000-000000000000' AND p.architect_id IS NULL)
      OR p.architect_id = p_architect_id
    )
    AND (p_filter_by_deadline = FALSE OR p.deadline IS NOT NULL);

  -- Near due e overdue baseados no estado atual (não histórico)
  SELECT 
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND stage NOT IN ('aprovado', 'perdido')),
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < NOW() AND stage NOT IN ('aprovado', 'perdido'))
  INTO v_near_due, v_overdue
  FROM projects
  WHERE (
    p_architect_id IS NULL 
    OR (p_architect_id = '00000000-0000-0000-0000-000000000000' AND architect_id IS NULL)
    OR architect_id = p_architect_id
  );

  RETURN QUERY SELECT 
    v_recebido,
    v_em_orcamento,
    v_orcado,
    v_apresentado,
    v_em_negociacao,
    v_aprovado,
    v_aprovado_value,
    v_perdido,
    v_near_due,
    v_overdue,
    v_total_value;
END;
$$;