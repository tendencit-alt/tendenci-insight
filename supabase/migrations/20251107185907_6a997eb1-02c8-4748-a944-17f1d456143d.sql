-- ============================================
-- FUNÇÕES RPC PARA DASHBOARD
-- ============================================

-- Função para métricas gerais do CRM Kanban
CREATE OR REPLACE FUNCTION public.dashboard_crm_metrics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'em_orcamento', COUNT(*) FILTER (WHERE d.status = 'aberto' AND s.name ILIKE '%orçamento%'),
    'fechado', COUNT(*) FILTER (WHERE d.status = 'won'),
    'perdido', COUNT(*) FILTER (WHERE d.status = 'lost'),
    'total_leads', (SELECT COUNT(*) FROM crm_deals),
    'projetos_ativos', COUNT(*) FILTER (WHERE d.status = 'aberto'),
    'valor_fechado', COALESCE(SUM(d.value) FILTER (WHERE d.status = 'won'), 0),
    'valor_perdido', COALESCE(SUM(d.value) FILTER (WHERE d.status = 'lost'), 0)
  ) INTO result
  FROM crm_deals d
  LEFT JOIN crm_stages s ON s.id = d.stage_id;

  RETURN result;
END;
$$;

-- Função para origem dos leads do CRM
CREATE OR REPLACE FUNCTION public.dashboard_lead_origins()
RETURNS TABLE(
  origin TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(ls.name, 'Outros') as origin,
    COUNT(l.id) as count
  FROM leads l
  LEFT JOIN lead_sources ls ON ls.id = l.source_id
  GROUP BY ls.name
  ORDER BY count DESC;
$$;

-- Função para projetos por estágio (tabela projects original)
CREATE OR REPLACE FUNCTION public.dashboard_projects_by_stage()
RETURNS TABLE(
  stage TEXT,
  count BIGINT,
  value NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    stage,
    COUNT(*) as count,
    COALESCE(SUM(value), 0) as value
  FROM projects
  GROUP BY stage
  ORDER BY 
    CASE stage
      WHEN 'captado' THEN 1
      WHEN 'orçamento' THEN 2
      WHEN 'aprovado' THEN 3
      WHEN 'perdido' THEN 4
      ELSE 5
    END;
$$;

-- Função para arquitetos sem envio de projeto
CREATE OR REPLACE FUNCTION public.dashboard_architects_without_projects(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE(
  id UUID,
  name TEXT,
  days_since_last INTEGER,
  last_project_at TIMESTAMPTZ,
  phone TEXT,
  email TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.name,
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(p.created_at))::INTEGER, 999) as days_since_last,
    MAX(p.created_at) as last_project_at,
    a.phone,
    a.email
  FROM architects a
  LEFT JOIN projects p ON p.architect_id = a.id
  WHERE a.active = true
  GROUP BY a.id, a.name, a.phone, a.email
  HAVING MAX(p.created_at) IS NULL 
    OR EXTRACT(DAY FROM NOW() - MAX(p.created_at)) >= days_threshold
  ORDER BY days_since_last DESC
  LIMIT 10;
$$;

-- Função para tempo médio de resposta de arquitetos
-- (placeholder - requer integração com WhatsApp Evolution)
CREATE OR REPLACE FUNCTION public.dashboard_architect_response_time()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Placeholder para futuras integrações com WhatsApp
  -- Por enquanto retorna dados baseados em histórico de projetos
  SELECT json_build_object(
    'avg_days', COALESCE(
      ROUND(AVG(EXTRACT(DAY FROM (p.created_at - a.created_at))), 1),
      0
    ),
    'total_responses', COUNT(DISTINCT a.id)
  ) INTO result
  FROM projects p
  JOIN architects a ON a.id = p.architect_id
  WHERE p.created_at >= NOW() - INTERVAL '30 days';

  RETURN result;
END;
$$;

-- Função para custo de mensagens (placeholder para API Meta)
CREATE OR REPLACE FUNCTION public.dashboard_meta_message_cost()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Buscar dados de msg_costs se existirem
  SELECT json_build_object(
    'total_cost', COALESCE(SUM(cost), 0),
    'message_count', COUNT(*),
    'period_days', 30,
    'api_connected', CASE WHEN COUNT(*) > 0 THEN true ELSE false END
  ) INTO result
  FROM msg_costs
  WHERE day >= CURRENT_DATE - INTERVAL '30 days';

  RETURN result;
END;
$$;

-- Função para gasto com Meta Ads (placeholder para API Meta)
CREATE OR REPLACE FUNCTION public.dashboard_meta_ad_spend()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Buscar dados de ad_spend se existirem
  SELECT json_build_object(
    'total_spend', COALESCE(SUM(spend), 0),
    'total_leads', COALESCE(SUM(leads), 0),
    'cpl', CASE 
      WHEN SUM(leads) > 0 THEN ROUND(SUM(spend) / SUM(leads), 2)
      ELSE 0
    END,
    'impressions', COALESCE(SUM(impressions), 0),
    'clicks', COALESCE(SUM(clicks), 0),
    'period_days', 30,
    'api_connected', CASE WHEN COUNT(*) > 0 THEN true ELSE false END
  ) INTO result
  FROM ad_spend
  WHERE day >= CURRENT_DATE - INTERVAL '30 days';

  RETURN result;
END;
$$;