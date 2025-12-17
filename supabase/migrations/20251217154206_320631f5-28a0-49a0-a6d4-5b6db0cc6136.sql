
DROP FUNCTION IF EXISTS public.projects_metrics_by_history(text[], uuid, timestamp with time zone, timestamp with time zone, boolean);

CREATE OR REPLACE FUNCTION public.projects_metrics_by_history(p_stages text[] DEFAULT NULL::text[], p_architect_id uuid DEFAULT NULL::uuid, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_filter_by_deadline boolean DEFAULT false)
 RETURNS TABLE(recebido_count bigint, recebido_value numeric, em_orcamento_count bigint, em_orcamento_value numeric, orcado_count bigint, orcado_value numeric, apresentado_count bigint, apresentado_value numeric, em_negociacao_count bigint, em_negociacao_value numeric, aprovado_count bigint, aprovado_value numeric, perdido_count bigint, perdido_value numeric, near_due_count bigint, overdue_count bigint, total_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recebido BIGINT := 0;
  v_recebido_value NUMERIC := 0;
  v_em_orcamento BIGINT := 0;
  v_em_orcamento_value NUMERIC := 0;
  v_orcado BIGINT := 0;
  v_orcado_value NUMERIC := 0;
  v_apresentado BIGINT := 0;
  v_apresentado_value NUMERIC := 0;
  v_em_negociacao BIGINT := 0;
  v_em_negociacao_value NUMERIC := 0;
  v_aprovado BIGINT := 0;
  v_aprovado_value NUMERIC := 0;
  v_perdido BIGINT := 0;
  v_perdido_value NUMERIC := 0;
  v_near_due BIGINT := 0;
  v_overdue BIGINT := 0;
  v_total_value NUMERIC := 0;
BEGIN
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
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'recebido'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'em_orcamento'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'em_orcamento'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'orcado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'orcado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'apresentado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'apresentado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'em_negociacao'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'em_negociacao'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'aprovado'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'aprovado'), 0),
    COALESCE((SELECT cnt FROM stage_counts WHERE target_stage = 'perdido'), 0),
    COALESCE((SELECT total_val FROM stage_values WHERE target_stage = 'perdido'), 0)
  INTO v_recebido, v_recebido_value, v_em_orcamento, v_em_orcamento_value, v_orcado, v_orcado_value, v_apresentado, v_apresentado_value, v_em_negociacao, v_em_negociacao_value, v_aprovado, v_aprovado_value, v_perdido, v_perdido_value;

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
    v_recebido_value,
    v_em_orcamento,
    v_em_orcamento_value,
    v_orcado,
    v_orcado_value,
    v_apresentado,
    v_apresentado_value,
    v_em_negociacao,
    v_em_negociacao_value,
    v_aprovado,
    v_aprovado_value,
    v_perdido,
    v_perdido_value,
    v_near_due,
    v_overdue,
    v_total_value;
END;
$function$;
