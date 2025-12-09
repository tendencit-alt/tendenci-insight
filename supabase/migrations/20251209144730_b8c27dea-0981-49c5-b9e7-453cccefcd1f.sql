-- =====================================================
-- RPC PARAMETRIZADA PARA MÉTRICAS DE PROJETOS FILTRADAS
-- =====================================================

CREATE OR REPLACE FUNCTION projects_metrics_filtered(
  p_stages TEXT[] DEFAULT NULL,
  p_architect_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
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
SET search_path = public
AS $$
DECLARE
  date_field TEXT;
BEGIN
  -- Determinar qual campo de data usar
  date_field := CASE WHEN p_filter_by_deadline THEN 'deadline' ELSE 'created_at' END;
  
  RETURN QUERY
  WITH filtered_projects AS (
    SELECT p.*
    FROM projects p
    WHERE 
      -- Filtro de estágios (array)
      (p_stages IS NULL OR array_length(p_stages, 1) IS NULL OR p.stage = ANY(p_stages))
      -- Filtro de arquiteto
      AND (p_architect_id IS NULL OR p.architect_id = p_architect_id OR (p_architect_id = '00000000-0000-0000-0000-000000000000' AND p.architect_id IS NULL))
      -- Filtro de data
      AND (
        p_date_from IS NULL OR 
        (CASE 
          WHEN p_filter_by_deadline THEN p.deadline >= p_date_from
          ELSE p.created_at >= p_date_from
        END)
      )
      AND (
        p_date_to IS NULL OR 
        (CASE 
          WHEN p_filter_by_deadline THEN p.deadline <= p_date_to
          ELSE p.created_at <= p_date_to
        END)
      )
  )
  SELECT 
    COUNT(*) FILTER (WHERE fp.stage = 'recebido')::BIGINT AS recebido_count,
    COUNT(*) FILTER (WHERE fp.stage = 'em_orcamento')::BIGINT AS em_orcamento_count,
    COUNT(*) FILTER (WHERE fp.stage = 'orcado')::BIGINT AS orcado_count,
    COUNT(*) FILTER (WHERE fp.stage = 'apresentado')::BIGINT AS apresentado_count,
    COUNT(*) FILTER (WHERE fp.stage = 'em_negociacao')::BIGINT AS em_negociacao_count,
    COUNT(*) FILTER (WHERE fp.stage = 'aprovado')::BIGINT AS aprovado_count,
    COALESCE(SUM(fp.value) FILTER (WHERE fp.stage = 'aprovado'), 0)::NUMERIC AS aprovado_value,
    COUNT(*) FILTER (WHERE fp.stage = 'perdido')::BIGINT AS perdido_count,
    COUNT(*) FILTER (WHERE fp.deadline IS NOT NULL AND fp.deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days' AND fp.stage NOT IN ('aprovado', 'perdido'))::BIGINT AS near_due_count,
    COUNT(*) FILTER (WHERE fp.deadline IS NOT NULL AND fp.deadline < NOW() AND fp.stage NOT IN ('aprovado', 'perdido', 'orcado', 'apresentado', 'em_negociacao'))::BIGINT AS overdue_count,
    COALESCE(SUM(fp.value), 0)::NUMERIC AS total_value
  FROM filtered_projects fp;
END;
$$;