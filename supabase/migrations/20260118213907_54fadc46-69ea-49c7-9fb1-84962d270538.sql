-- ==============================================
-- CORREÇÃO DE SEGURANÇA: Funções com triggers dependentes
-- ==============================================

-- 1. Drop trigger e recria a função create_production_phases_on_op_insert
DROP TRIGGER IF EXISTS create_phases_on_op_insert ON production_orders;
DROP FUNCTION IF EXISTS public.create_production_phases_on_op_insert();

CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO production_phases (production_order_id, phase_template_id, status, position)
  SELECT 
    NEW.id,
    ppt.id,
    'pending',
    ppt.position
  FROM production_phase_templates ppt
  WHERE ppt.production_type_id = NEW.production_type_id
  ORDER BY ppt.position;
  
  RETURN NEW;
END;
$function$;

-- Recria o trigger
CREATE TRIGGER create_phases_on_op_insert
  AFTER INSERT ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_production_phases_on_op_insert();

-- 2. get_prospeccao_architects_optimized (sem dependências)
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

-- 3. production_sla_alerts
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