-- Função RPC para buscar deals sem tarefas válidas
-- Usa NOW() do servidor para garantir consistência
CREATE OR REPLACE FUNCTION public.get_deals_without_valid_tasks(
  p_pipeline_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_is_master BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  stage_id UUID,
  stage_name TEXT,
  owner_id UUID,
  owner_name TEXT,
  lead_id UUID,
  client_name TEXT,
  client_phone TEXT,
  stage_entered_at TIMESTAMPTZ,
  hours_without_task INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.stage_id,
    s.name as stage_name,
    d.owner_id,
    p.full_name as owner_name,
    d.lead_id,
    c.name as client_name,
    c.phone as client_phone,
    d.stage_entered_at,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(d.stage_entered_at, d.created_at)))::INTEGER / 3600 as hours_without_task
  FROM crm_deals d
  JOIN crm_stages s ON d.stage_id = s.id
  LEFT JOIN profiles p ON d.owner_id = p.id
  LEFT JOIN leads l ON d.lead_id = l.id
  LEFT JOIN clients c ON l.client_id = c.id
  WHERE d.pipeline_id = p_pipeline_id
    AND d.status = 'aberto'
    AND (s.name ILIKE '%qualificação%' OR s.name ILIKE '%negociação%' OR s.name ILIKE '%qualificacao%' OR s.name ILIKE '%negociacao%')
    AND (p_is_master = TRUE OR d.owner_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM crm_tasks t
      WHERE t.deal_id = d.id
        AND t.status IN ('open', 'pendente')
        AND t.due_at >= NOW()  -- Usa NOW() do servidor!
    )
  ORDER BY hours_without_task DESC;
END;
$$;