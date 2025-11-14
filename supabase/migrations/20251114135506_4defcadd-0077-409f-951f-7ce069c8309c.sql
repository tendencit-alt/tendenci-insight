-- Remover o constraint existente de stage
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_stage_check;

-- Atualizar projetos existentes para as novas etapas
UPDATE projects 
SET stage = CASE 
  WHEN stage = 'captado' THEN 'recebido'
  WHEN stage = 'orçamento' THEN 'em_desenvolvimento'
  WHEN stage = 'aprovado' THEN 'aprovado'
  WHEN stage = 'perdido' THEN 'perdido'
  ELSE 'recebido'
END;

-- Adicionar novo constraint com as etapas corretas
ALTER TABLE projects 
ADD CONSTRAINT projects_stage_check 
CHECK (stage IN ('recebido', 'em_desenvolvimento', 'aguardando_aprovacao', 'aprovado', 'perdido'));

-- Adicionar campos úteis para gestão de projetos
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS sent_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS lost_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS lost_reason text;

-- Atualizar o default da coluna stage
ALTER TABLE projects 
ALTER COLUMN stage SET DEFAULT 'recebido';

-- Criar função para calcular métricas de projetos
CREATE OR REPLACE FUNCTION projects_metrics()
RETURNS TABLE (
  recebido_count bigint,
  em_desenvolvimento_count bigint,
  aguardando_aprovacao_count bigint,
  aprovado_count bigint,
  aprovado_value numeric,
  perdido_count bigint,
  near_due_count bigint,
  overdue_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE stage = 'recebido') as recebido_count,
    COUNT(*) FILTER (WHERE stage = 'em_desenvolvimento') as em_desenvolvimento_count,
    COUNT(*) FILTER (WHERE stage = 'aguardando_aprovacao') as aguardando_aprovacao_count,
    COUNT(*) FILTER (WHERE stage = 'aprovado') as aprovado_count,
    COALESCE(SUM(value) FILTER (WHERE stage = 'aprovado'), 0) as aprovado_value,
    COUNT(*) FILTER (WHERE stage = 'perdido') as perdido_count,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND stage NOT IN ('aprovado', 'perdido')) as near_due_count,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < NOW() AND stage NOT IN ('aprovado', 'perdido')) as overdue_count
  FROM projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para desempenho por arquiteto
CREATE OR REPLACE FUNCTION architect_performance_metrics(period_days integer DEFAULT 30)
RETURNS TABLE (
  architect_id uuid,
  architect_name text,
  categoria text,
  total_projects bigint,
  approved_projects bigint,
  lost_projects bigint,
  in_progress_projects bigint,
  total_value numeric,
  approval_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as architect_id,
    a.name as architect_name,
    a.categoria,
    COUNT(p.id) as total_projects,
    COUNT(*) FILTER (WHERE p.stage = 'aprovado') as approved_projects,
    COUNT(*) FILTER (WHERE p.stage = 'perdido') as lost_projects,
    COUNT(*) FILTER (WHERE p.stage IN ('recebido', 'em_desenvolvimento', 'aguardando_aprovacao')) as in_progress_projects,
    COALESCE(SUM(p.value) FILTER (WHERE p.stage = 'aprovado'), 0) as total_value,
    CASE 
      WHEN COUNT(*) FILTER (WHERE p.stage IN ('aprovado', 'perdido')) > 0 
      THEN (COUNT(*) FILTER (WHERE p.stage = 'aprovado')::numeric / COUNT(*) FILTER (WHERE p.stage IN ('aprovado', 'perdido'))::numeric * 100)
      ELSE 0
    END as approval_rate
  FROM architects a
  LEFT JOIN projects p ON p.architect_id = a.id 
    AND p.created_at >= NOW() - (period_days || ' days')::interval
  WHERE a.active = true
  GROUP BY a.id, a.name, a.categoria
  HAVING COUNT(p.id) > 0
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;