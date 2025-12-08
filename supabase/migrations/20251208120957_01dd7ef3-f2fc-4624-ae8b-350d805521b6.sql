-- Atualizar RPC crm_agg para aceitar parâmetros de filtro adicionais
DROP FUNCTION IF EXISTS public.crm_agg(UUID);

CREATE OR REPLACE FUNCTION public.crm_agg(
  p_pipeline_id UUID,
  p_category TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  user_especializacao TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Obter especialização e role do usuário atual
  SELECT especializacao, (role = 'admin') INTO user_especializacao, is_admin
  FROM profiles
  WHERE id = auth.uid();

  SELECT json_build_object(
    'new_deals', COUNT(*) FILTER (WHERE d.status = 'aberto'),
    'won_deals', COUNT(*) FILTER (WHERE d.status = 'won'),
    'lost_deals', COUNT(*) FILTER (WHERE d.status = 'lost'),
    'total_value', COALESCE(SUM(d.value), 0),
    'won_value', COALESCE(SUM(d.value) FILTER (WHERE d.status = 'won'), 0),
    'lost_value', COALESCE(SUM(d.value) FILTER (WHERE d.status = 'lost'), 0)
  ) INTO result
  FROM crm_deals d
  WHERE d.pipeline_id = p_pipeline_id
    -- Filtro de categoria
    AND (p_category IS NULL OR p_category = 'all' OR d.categoria = p_category)
    -- Filtro de responsável
    AND (p_owner_id IS NULL OR d.owner_id = p_owner_id)
    -- Filtro de data
    AND (p_date_from IS NULL OR d.created_at >= p_date_from)
    AND (p_date_to IS NULL OR d.created_at <= p_date_to)
    -- Filtro de especialização do usuário
    AND (
      is_admin = TRUE
      OR user_especializacao = 'todos'
      OR user_especializacao IS NULL
      OR (user_especializacao = 'moveis_soltos' AND d.categoria = 'Móveis Soltos')
      OR (user_especializacao = 'moveis_planejados' AND d.categoria = 'Planejados')
    );

  RETURN result;
END;
$function$;

-- Atualizar RPC crm_sla_alerts para aceitar parâmetros de filtro adicionais
DROP FUNCTION IF EXISTS public.crm_sla_alerts(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.crm_sla_alerts(
  p_pipeline_id UUID,
  p_max_delay_days INTEGER DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  deal_id UUID,
  title TEXT,
  lead_name TEXT,
  stage_name TEXT,
  delay_h INTEGER,
  owner_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_especializacao TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Obter especialização e role do usuário atual
  SELECT especializacao, (role = 'admin') INTO user_especializacao, is_admin
  FROM profiles
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT 
    d.id AS deal_id,
    d.title,
    COALESCE(c.name, 'Sem cliente') AS lead_name,
    s.name AS stage_name,
    EXTRACT(EPOCH FROM (NOW() - d.stage_entered_at))::INTEGER / 3600 AS delay_h,
    COALESCE(p.full_name, 'Sem responsável') AS owner_name
  FROM crm_deals d
  JOIN crm_stages s ON d.stage_id = s.id
  LEFT JOIN leads l ON d.lead_id = l.id
  LEFT JOIN clients c ON l.client_id = c.id
  LEFT JOIN profiles p ON d.owner_id = p.id
  WHERE d.pipeline_id = p_pipeline_id
    AND d.status = 'aberto'
    AND s.sla_hours IS NOT NULL
    AND d.stage_entered_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - d.stage_entered_at))::INTEGER / 3600 > s.sla_hours
    -- Filtro de max delay days
    AND (p_max_delay_days IS NULL OR 
         EXTRACT(EPOCH FROM (NOW() - d.stage_entered_at))::INTEGER / 3600 <= (p_max_delay_days * 24))
    -- Filtro de categoria
    AND (p_category IS NULL OR p_category = 'all' OR d.categoria = p_category)
    -- Filtro de responsável
    AND (p_owner_id IS NULL OR d.owner_id = p_owner_id)
    -- Filtro de especialização do usuário
    AND (
      is_admin = TRUE
      OR user_especializacao = 'todos'
      OR user_especializacao IS NULL
      OR (user_especializacao = 'moveis_soltos' AND d.categoria = 'Móveis Soltos')
      OR (user_especializacao = 'moveis_planejados' AND d.categoria = 'Planejados')
    )
  ORDER BY delay_h DESC;
END;
$function$;