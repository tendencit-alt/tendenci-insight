-- Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS public.crm_agg(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.crm_agg(UUID);
DROP FUNCTION IF EXISTS public.crm_agg(UUID, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.crm_sla_alerts(UUID);
DROP FUNCTION IF EXISTS public.crm_sla_alerts(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.crm_sla_alerts(UUID, INTEGER, TEXT, UUID);

-- Create crm_agg with all filter parameters
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
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'new_deals', COUNT(*),
    'won_value', COALESCE(SUM(CASE WHEN status = 'won' THEN value ELSE 0 END), 0),
    'won_count', COUNT(*) FILTER (WHERE status = 'won'),
    'lost_value', COALESCE(SUM(CASE WHEN status = 'lost' THEN value ELSE 0 END), 0),
    'lost_count', COUNT(*) FILTER (WHERE status = 'lost'),
    'open_deals', COUNT(*) FILTER (WHERE status = 'aberto'),
    'open_value', COALESCE(SUM(CASE WHEN status = 'aberto' THEN value ELSE 0 END), 0),
    'total_value', COALESCE(SUM(value), 0)
  ) INTO result
  FROM crm_deals
  WHERE pipeline_id = p_pipeline_id
    AND (p_category IS NULL OR categoria = p_category)
    AND (p_owner_id IS NULL OR owner_id = p_owner_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  RETURN result;
END;
$$;

-- Create crm_sla_alerts with all filter parameters
CREATE OR REPLACE FUNCTION public.crm_sla_alerts(
  p_pipeline_id UUID,
  p_max_delay_days INTEGER DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS TABLE(
  deal_id UUID,
  title TEXT,
  lead_name TEXT,
  stage_name TEXT,
  owner_name TEXT,
  delay_h INTEGER,
  sla_hours INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS deal_id,
    d.title,
    COALESCE(c.name, 'Sem cliente') AS lead_name,
    s.name AS stage_name,
    COALESCE(p.full_name, p.username, 'Sem responsável') AS owner_name,
    EXTRACT(EPOCH FROM (NOW() - d.stage_entered_at))::INTEGER / 3600 AS delay_h,
    COALESCE(s.sla_hours, 24) AS sla_hours
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
    AND (p_category IS NULL OR d.categoria = p_category)
    AND (p_owner_id IS NULL OR d.owner_id = p_owner_id)
    AND (p_max_delay_days IS NULL OR d.stage_entered_at >= NOW() - (p_max_delay_days || ' days')::INTERVAL)
  ORDER BY delay_h DESC;
END;
$$;