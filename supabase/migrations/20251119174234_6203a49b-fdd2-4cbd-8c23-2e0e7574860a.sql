
-- Corrigir função crm_agg para respeitar especialização do vendedor
CREATE OR REPLACE FUNCTION public.crm_agg(p_pipeline_id uuid, p_start timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end timestamp with time zone DEFAULT now())
 RETURNS json
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

  -- Construir resultado filtrando por especialização
  SELECT json_build_object(
    'new_deals', COUNT(*) FILTER (WHERE created_at BETWEEN p_start AND p_end),
    'won_value', COALESCE(SUM(value) FILTER (WHERE status = 'won' AND updated_at BETWEEN p_start AND p_end), 0),
    'lost_value', COALESCE(SUM(value) FILTER (WHERE status = 'lost' AND updated_at BETWEEN p_start AND p_end), 0),
    'win_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('won', 'lost') AND updated_at BETWEEN p_start AND p_end) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'won' AND updated_at BETWEEN p_start AND p_end)::NUMERIC / 
                  COUNT(*) FILTER (WHERE status IN ('won', 'lost') AND updated_at BETWEEN p_start AND p_end)) * 100, 1)
      ELSE 0
    END,
    'avg_stage_time', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (now() - stage_entered_at)) / 3600) FILTER (WHERE status = 'aberto'), 1), 0)
  ) INTO result
  FROM crm_deals
  WHERE pipeline_id = p_pipeline_id
    -- Aplicar filtro de especialização
    AND (
      is_admin = TRUE
      OR user_especializacao = 'todos'
      OR (user_especializacao = 'moveis_soltos' AND categoria = 'Móveis Soltos')
      OR (user_especializacao = 'moveis_planejados' AND categoria = 'Planejados')
    );

  RETURN result;
END;
$function$;

-- Corrigir função crm_sla_alerts para respeitar especialização do vendedor
CREATE OR REPLACE FUNCTION public.crm_sla_alerts(p_pipeline_id uuid)
 RETURNS TABLE(deal_id uuid, title text, lead_name text, stage_name text, delay_h numeric, owner_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH user_info AS (
    SELECT especializacao, (role = 'admin') as is_admin
    FROM profiles
    WHERE id = auth.uid()
  )
  SELECT 
    d.id as deal_id,
    d.title,
    COALESCE(c.name, 'Sem cliente') as lead_name,
    s.name as stage_name,
    ROUND(EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600, 1) as delay_h,
    COALESCE(p.full_name, p.email, 'Sem responsável') as owner_name
  FROM crm_deals d
  LEFT JOIN leads l ON l.id = d.lead_id
  LEFT JOIN clients c ON c.id = l.client_id
  LEFT JOIN crm_stages s ON s.id = d.stage_id
  LEFT JOIN profiles p ON p.id = d.owner_id
  CROSS JOIN user_info ui
  WHERE d.pipeline_id = p_pipeline_id
    AND d.status = 'aberto'
    AND s.sla_hours IS NOT NULL
    AND EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600 > s.sla_hours
    -- Aplicar filtro de especialização
    AND (
      ui.is_admin = TRUE
      OR ui.especializacao = 'todos'
      OR (ui.especializacao = 'moveis_soltos' AND d.categoria = 'Móveis Soltos')
      OR (ui.especializacao = 'moveis_planejados' AND d.categoria = 'Planejados')
    )
  ORDER BY delay_h DESC;
$function$;

-- Verificar e corrigir dashboard_crm_metrics também
CREATE OR REPLACE FUNCTION public.dashboard_crm_metrics(p_start timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end timestamp with time zone DEFAULT now())
 RETURNS json
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

  -- Construir métricas filtrando por especialização
  SELECT json_build_object(
    'total_deals', COUNT(*),
    'open_deals', COUNT(*) FILTER (WHERE status = 'aberto'),
    'won_deals', COUNT(*) FILTER (WHERE status = 'won'),
    'lost_deals', COUNT(*) FILTER (WHERE status = 'lost'),
    'total_value', COALESCE(SUM(value), 0),
    'won_value', COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0),
    'avg_deal_value', COALESCE(AVG(value) FILTER (WHERE value > 0), 0)
  ) INTO result
  FROM crm_deals
  WHERE created_at BETWEEN p_start AND p_end
    -- Aplicar filtro de especialização
    AND (
      is_admin = TRUE
      OR user_especializacao = 'todos'
      OR (user_especializacao = 'moveis_soltos' AND categoria = 'Móveis Soltos')
      OR (user_especializacao = 'moveis_planejados' AND categoria = 'Planejados')
    );

  RETURN result;
END;
$function$;
