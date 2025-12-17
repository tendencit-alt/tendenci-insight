-- Drop existing function and recreate with new return type
DROP FUNCTION IF EXISTS projects_metrics_by_history(text[],uuid,timestamp with time zone,timestamp with time zone,boolean);

-- Create updated function with perdido and aprovado stages
CREATE OR REPLACE FUNCTION projects_metrics_by_history(
  p_stages TEXT[] DEFAULT NULL,
  p_architect_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_filter_by_deadline BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  recebido_count BIGINT,
  em_orcamento_count BIGINT,
  orcado_count BIGINT,
  orcado_value NUMERIC,
  apresentado_count BIGINT,
  apresentado_value NUMERIC,
  em_negociacao_count BIGINT,
  aprovado_count BIGINT,
  aprovado_value NUMERIC,
  perdido_count BIGINT,
  perdido_value NUMERIC,
  near_due_count BIGINT,
  overdue_count BIGINT,
  total_value NUMERIC
) AS $$
DECLARE
  v_recebido BIGINT := 0;
  v_em_orcamento BIGINT := 0;
  v_orcado BIGINT := 0;
  v_orcado_value NUMERIC := 0;
  v_apresentado BIGINT := 0;
  v_apresentado_value NUMERIC := 0;
  v_em_negociacao BIGINT := 0;
  v_aprovado BIGINT := 0;
  v_aprovado_value NUMERIC := 0;
  v_perdido BIGINT := 0;
  v_perdido_value NUMERIC := 0;
  v_near_due BIGINT := 0;
  v_overdue BIGINT := 0;
  v_total_value NUMERIC := 0;
BEGIN
  -- Count projects that ENTERED each stage during the period (based on history)
  WITH stage_entries AS (
    SELECT 
      ph.project_id,
      CASE 
        WHEN ph.description LIKE 'Estágio alterado%' THEN
          LOWER(TRIM(REPLACE(REPLACE(SPLIT_PART(SPLIT_PART(ph.description, 'para "', 2), '"', 1), ' ', '_'), 'ç', 'c')))
        WHEN ph.description LIKE 'Projeto criado no estágio:%' THEN
          LOWER(TRIM(REPLACE(REPLACE(REPLACE(ph.description, 'Projeto criado no estágio: ', ''), ' ', '_'), 'ç', 'c')))
        ELSE NULL
      END AS target_stage,
      ph.created_at
    FROM project_history ph
    JOIN projects p ON p.id = ph.project_id
    WHERE 
      (ph.event_type = 'status' OR (ph.event_type = 'sistema' AND ph.description LIKE 'Projeto criado no estágio:%'))
      AND (p_date_from IS NULL OR ph.created_at >= p_date_from)
      AND (p_date_to IS NULL OR ph.created_at <= p_date_to)
      AND (
        p_architect_id IS NULL
        OR (p_architect_id = '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id IS NULL)
        OR (p_architect_id != '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id = p_architect_id)
      )
  ),
  stage_counts AS (
    SELECT 
      se.target_stage,
      COUNT(DISTINCT se.project_id) as cnt
    FROM stage_entries se
    WHERE se.target_stage IS NOT NULL
    GROUP BY se.target_stage
  ),
  stage_values AS (
    SELECT 
      se.target_stage,
      SUM(COALESCE(p.value, 0)) as total_val
    FROM stage_entries se
    JOIN projects p ON p.id = se.project_id
    WHERE se.target_stage IS NOT NULL
    GROUP BY se.target_stage
  )
  SELECT 
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'recebido'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'em_orcamento'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'orcado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'orcado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'apresentado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'apresentado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'em_negociacao'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'aprovado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'aprovado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'perdido'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'perdido'), 0)
  INTO v_recebido, v_em_orcamento, v_orcado, v_orcado_value, v_apresentado, v_apresentado_value, v_em_negociacao, v_aprovado, v_aprovado_value, v_perdido, v_perdido_value;

  -- Near due and overdue (based on current state, not history)
  SELECT COUNT(*) INTO v_near_due
  FROM projects p
  WHERE p.deadline IS NOT NULL
    AND p.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
    AND p.stage NOT IN ('aprovado', 'perdido')
    AND (
      p_architect_id IS NULL
      OR (p_architect_id = '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id IS NULL)
      OR (p_architect_id != '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id = p_architect_id)
    );

  SELECT COUNT(*) INTO v_overdue
  FROM projects p
  WHERE p.deadline IS NOT NULL
    AND p.deadline < CURRENT_DATE
    AND p.stage NOT IN ('aprovado', 'perdido')
    AND (
      p_architect_id IS NULL
      OR (p_architect_id = '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id IS NULL)
      OR (p_architect_id != '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id = p_architect_id)
    );

  -- Total value (sum of all projects that entered any stage in period)
  SELECT COALESCE(SUM(p.value), 0) INTO v_total_value
  FROM projects p
  WHERE EXISTS (
    SELECT 1 FROM project_history ph 
    WHERE ph.project_id = p.id 
      AND (ph.event_type = 'status' OR (ph.event_type = 'sistema' AND ph.description LIKE 'Projeto criado no estágio:%'))
      AND (p_date_from IS NULL OR ph.created_at >= p_date_from)
      AND (p_date_to IS NULL OR ph.created_at <= p_date_to)
  )
  AND (
    p_architect_id IS NULL
    OR (p_architect_id = '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id IS NULL)
    OR (p_architect_id != '00000000-0000-0000-0000-000000000000'::uuid AND p.architect_id = p_architect_id)
  );

  RETURN QUERY SELECT 
    v_recebido,
    v_em_orcamento,
    v_orcado,
    v_orcado_value,
    v_apresentado,
    v_apresentado_value,
    v_em_negociacao,
    v_aprovado,
    v_aprovado_value,
    v_perdido,
    v_perdido_value,
    v_near_due,
    v_overdue,
    v_total_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;