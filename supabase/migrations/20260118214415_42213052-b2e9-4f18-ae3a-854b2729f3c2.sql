-- ==============================================
-- CORREÇÃO DE SEGURANÇA BATCH 3: Funções restantes
-- ==============================================

-- 1. acquire_message_lock
CREATE OR REPLACE FUNCTION public.acquire_message_lock(p_phone text, p_instance text)
RETURNS TABLE(id uuid, phone_number text, instance_name text, content text, created_at timestamp with time zone, processed boolean, is_processing boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH locked_row AS (
    SELECT pm.id
    FROM ia_pending_messages pm
    WHERE pm.phone_number = p_phone
      AND pm.instance_name = p_instance
      AND pm.processed = false
      AND pm.is_processing = false
    ORDER BY pm.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE ia_pending_messages pm
  SET is_processing = true
  FROM locked_row
  WHERE pm.id = locked_row.id
  RETURNING pm.id, pm.phone_number, pm.instance_name, pm.content, pm.created_at, pm.processed, pm.is_processing;
END;
$function$;

-- 2. add_business_days_sql
CREATE OR REPLACE FUNCTION public.add_business_days_sql(start_date date, num_days integer)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  result_date DATE := start_date;
  days_added INTEGER := 0;
BEGIN
  WHILE days_added < num_days LOOP
    result_date := result_date + INTERVAL '1 day';
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result_date;
END;
$function$;

-- 3. architect_performance_metrics
CREATE OR REPLACE FUNCTION public.architect_performance_metrics(period_days integer DEFAULT 30)
RETURNS TABLE(architect_id uuid, architect_name text, categoria text, total_projects bigint, approved_projects bigint, lost_projects bigint, in_progress_projects bigint, total_value numeric, approval_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 4. can_delete_master_idea
CREATE OR REPLACE FUNCTION public.can_delete_master_idea(p_master_idea_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM ia_products WHERE master_idea_id = p_master_idea_id
  );
END;
$function$;

-- 5. cleanup_old_pending_messages
CREATE OR REPLACE FUNCTION public.cleanup_old_pending_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM ia_pending_messages
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND processed = true;
END;
$function$;

-- 6. get_campaign_evolution
CREATE OR REPLACE FUNCTION public.get_campaign_evolution(p_start_date date, p_end_date date)
RETURNS TABLE(period_date date, total_leads bigint, total_deals bigint, total_value numeric, conversion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    d.date as period_date,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT cd.id) as total_deals,
    COALESCE(SUM(cd.value), 0) as total_value,
    CASE 
      WHEN COUNT(DISTINCT l.id) > 0 
      THEN (COUNT(DISTINCT cd.id)::numeric / COUNT(DISTINCT l.id)::numeric * 100)
      ELSE 0
    END as conversion_rate
  FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(date)
  LEFT JOIN leads l ON DATE(l.created_at) = d.date
  LEFT JOIN crm_deals cd ON cd.lead_id = l.id
  GROUP BY d.date
  ORDER BY d.date;
END;
$function$;

-- 7. get_campaign_metrics
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(p_start_date date, p_end_date date)
RETURNS TABLE(total_leads bigint, total_deals bigint, total_value numeric, conversion_rate numeric, avg_deal_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT cd.id) as total_deals,
    COALESCE(SUM(cd.value), 0) as total_value,
    CASE 
      WHEN COUNT(DISTINCT l.id) > 0 
      THEN (COUNT(DISTINCT cd.id)::numeric / COUNT(DISTINCT l.id)::numeric * 100)
      ELSE 0
    END as conversion_rate,
    CASE 
      WHEN COUNT(DISTINCT cd.id) > 0 
      THEN SUM(cd.value) / COUNT(DISTINCT cd.id)
      ELSE 0
    END as avg_deal_value
  FROM leads l
  LEFT JOIN crm_deals cd ON cd.lead_id = l.id
  WHERE l.created_at >= p_start_date AND l.created_at < p_end_date + INTERVAL '1 day';
END;
$function$;

-- 8. get_campaign_vendor_comparison
CREATE OR REPLACE FUNCTION public.get_campaign_vendor_comparison(p_start_date date, p_end_date date)
RETURNS TABLE(vendor_id uuid, vendor_name text, total_leads bigint, total_deals bigint, total_value numeric, conversion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as vendor_id,
    p.full_name as vendor_name,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT cd.id) as total_deals,
    COALESCE(SUM(cd.value), 0) as total_value,
    CASE 
      WHEN COUNT(DISTINCT l.id) > 0 
      THEN (COUNT(DISTINCT cd.id)::numeric / COUNT(DISTINCT l.id)::numeric * 100)
      ELSE 0
    END as conversion_rate
  FROM profiles p
  LEFT JOIN leads l ON l.assigned_to = p.id 
    AND l.created_at >= p_start_date 
    AND l.created_at < p_end_date + INTERVAL '1 day'
  LEFT JOIN crm_deals cd ON cd.lead_id = l.id
  WHERE p.role IN ('vendedor', 'admin')
  GROUP BY p.id, p.full_name
  ORDER BY total_value DESC;
END;
$function$;

-- 9. get_effective_sla_dias_uteis
DROP FUNCTION IF EXISTS public.get_effective_sla_dias_uteis(uuid);

CREATE OR REPLACE FUNCTION public.get_effective_sla_dias_uteis(p_phase_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_custom_sla integer;
  v_template_sla integer;
BEGIN
  SELECT 
    pp.sla_dias_uteis_custom,
    ppt.sla_dias_uteis
  INTO v_custom_sla, v_template_sla
  FROM production_phases pp
  LEFT JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
  WHERE pp.id = p_phase_id;
  
  RETURN COALESCE(v_custom_sla, v_template_sla, 0);
END;
$function$;

-- 10. get_ia_config
CREATE OR REPLACE FUNCTION public.get_ia_config(config_key_param text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  result_value text;
BEGIN
  SELECT config_value INTO result_value
  FROM ia_config
  WHERE config_key = config_key_param
  LIMIT 1;
  
  RETURN result_value;
END;
$function$;

-- 11. get_prospeccao_architects_optimized
DROP FUNCTION IF EXISTS public.get_prospeccao_architects_optimized(text, text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.get_prospeccao_architects_optimized(
  p_search text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_vendedor text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_nao_contactados boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  name text,
  phone text,
  email text,
  city text,
  tier text,
  status_funil text,
  vendedor_responsavel uuid,
  vendedor_nome text,
  data_primeiro_contato timestamp with time zone,
  data_ultimo_contato timestamp with time zone,
  instagram text,
  company text,
  created_at timestamp with time zone,
  active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.phone,
    a.email,
    a.city,
    a.tier,
    a.status_funil,
    a.vendedor_responsavel,
    p.full_name as vendedor_nome,
    a.data_primeiro_contato,
    a.data_ultimo_contato,
    a.instagram,
    a.company,
    a.created_at,
    a.active
  FROM architects a
  LEFT JOIN profiles p ON a.vendedor_responsavel = p.id
  WHERE a.categoria = 'prospecção'
    AND a.active = true
    AND (p_search IS NULL OR a.name ILIKE '%' || p_search || '%')
    AND (p_phone IS NULL OR a.phone ILIKE '%' || p_phone || '%')
    AND (p_vendedor IS NULL OR a.vendedor_responsavel::text = p_vendedor)
    AND (p_status IS NULL OR a.status_funil = p_status)
    AND (p_cidade IS NULL OR a.city = p_cidade)
    AND (p_tier IS NULL OR a.tier = p_tier)
    AND (NOT p_nao_contactados OR a.data_primeiro_contato IS NULL)
  ORDER BY a.created_at DESC;
END;
$function$;

-- 12. get_seller_goal_stats
CREATE OR REPLACE FUNCTION public.get_seller_goal_stats(p_user_id uuid, p_month integer, p_year integer)
RETURNS TABLE(goal_amount numeric, current_amount numeric, percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sg.target_amount as goal_amount,
    sg.current_progress as current_amount,
    CASE 
      WHEN sg.target_amount > 0 
      THEN (sg.current_progress / sg.target_amount * 100)
      ELSE 0
    END as percentage
  FROM seller_goals sg
  WHERE sg.user_id = p_user_id
    AND sg.month = p_month
    AND sg.year = p_year;
END;
$function$;

-- 13. production_sla_alerts
DROP FUNCTION IF EXISTS public.production_sla_alerts();

CREATE OR REPLACE FUNCTION public.production_sla_alerts()
RETURNS TABLE(
  order_id uuid,
  order_number text,
  phase_name text,
  hours_in_phase numeric,
  sla_hours integer,
  is_overdue boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    po.id as order_id,
    po.order_number,
    ppt.name as phase_name,
    EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 as hours_in_phase,
    COALESCE(ppt.sla_hours, 8) as sla_hours,
    EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 3600 > COALESCE(ppt.sla_hours, 8) as is_overdue
  FROM production_orders po
  JOIN production_phases pp ON pp.id = po.current_phase_id
  LEFT JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
  WHERE po.status = 'in_progress'
    AND pp.started_at IS NOT NULL
  ORDER BY is_overdue DESC, hours_in_phase DESC;
END;
$function$;