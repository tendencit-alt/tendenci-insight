
-- Dropar a função antiga
DROP FUNCTION IF EXISTS projects_metrics();

-- Recriar a função com os novos estágios
CREATE FUNCTION projects_metrics()
RETURNS TABLE(
  recebido_count bigint,
  em_orcamento_count bigint, 
  orcado_count bigint,
  apresentado_count bigint,
  em_negociacao_count bigint,
  aprovado_count bigint,
  aprovado_value numeric,
  perdido_count bigint,
  near_due_count bigint,
  overdue_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE stage = 'recebido') as recebido_count,
    COUNT(*) FILTER (WHERE stage = 'em_orcamento') as em_orcamento_count,
    COUNT(*) FILTER (WHERE stage = 'orcado') as orcado_count,
    COUNT(*) FILTER (WHERE stage = 'apresentado') as apresentado_count,
    COUNT(*) FILTER (WHERE stage = 'em_negociacao') as em_negociacao_count,
    COUNT(*) FILTER (WHERE stage = 'aprovado') as aprovado_count,
    COALESCE(SUM(value) FILTER (WHERE stage = 'aprovado'), 0) as aprovado_value,
    COUNT(*) FILTER (WHERE stage = 'perdido') as perdido_count,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND stage NOT IN ('aprovado', 'perdido')) as near_due_count,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < NOW() AND stage NOT IN ('aprovado', 'perdido')) as overdue_count
  FROM projects;
END;
$$;
