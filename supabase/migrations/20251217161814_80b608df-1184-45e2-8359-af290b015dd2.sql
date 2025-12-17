-- Drop and recreate with correct column names
DROP FUNCTION IF EXISTS public.projects_metrics_by_history(timestamp with time zone, timestamp with time zone, uuid);

CREATE OR REPLACE FUNCTION public.projects_metrics_by_history(
  p_date_from timestamp with time zone DEFAULT NULL,
  p_date_to timestamp with time zone DEFAULT NULL,
  p_architect_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  WITH stage_entries AS (
    SELECT 
      ph.project_id,
      CASE 
        -- Quando projeto é criado, extrair estágio da descrição
        WHEN ph.event_type = 'sistema' AND ph.description LIKE 'Projeto criado no estágio:%' THEN
          LOWER(REPLACE(TRIM(SUBSTRING(ph.description FROM 'Projeto criado no estágio: (.+)')), ' ', '_'))
        -- Quando estágio muda, extrair novo estágio da descrição
        WHEN ph.event_type = 'status' AND ph.description LIKE 'Estágio alterado%' THEN
          LOWER(REPLACE(TRIM(SUBSTRING(ph.description FROM 'para "([^"]+)"')), ' ', '_'))
        ELSE NULL
      END as target_stage,
      ph.created_at as entry_date,
      p.value,
      p.architect_id
    FROM project_history ph
    JOIN projects p ON p.id = ph.project_id
    WHERE 
      (ph.event_type IN ('sistema', 'status'))
      AND (p_date_from IS NULL OR ph.created_at >= p_date_from)
      AND (p_date_to IS NULL OR ph.created_at <= p_date_to)
      AND (p_architect_id IS NULL OR p.architect_id = p_architect_id)
  )
  SELECT json_build_object(
    'recebido_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'recebido'),
    'recebido_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'recebido'
      ) sq
    ), 0),
    'em_orcamento_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'em_orcamento'),
    'em_orcamento_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'em_orcamento'
      ) sq
    ), 0),
    'orcado_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'orcado'),
    'orcado_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'orcado'
      ) sq
    ), 0),
    'apresentado_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'apresentado'),
    'apresentado_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'apresentado'
      ) sq
    ), 0),
    'em_negociacao_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'em_negociacao'),
    'em_negociacao_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'em_negociacao'
      ) sq
    ), 0),
    'aprovado_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'aprovado'),
    'aprovado_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'aprovado'
      ) sq
    ), 0),
    'perdido_count', (SELECT COUNT(DISTINCT project_id) FROM stage_entries WHERE target_stage = 'perdido'),
    'perdido_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value FROM stage_entries WHERE target_stage = 'perdido'
      ) sq
    ), 0),
    'total_orcado_count', (
      SELECT COUNT(DISTINCT project_id) 
      FROM stage_entries 
      WHERE target_stage IN ('orcado', 'apresentado', 'em_negociacao')
    ),
    'total_orcado_value', COALESCE((
      SELECT SUM(value) FROM (
        SELECT DISTINCT ON (project_id) project_id, value 
        FROM stage_entries 
        WHERE target_stage IN ('orcado', 'apresentado', 'em_negociacao')
      ) sq
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$function$;