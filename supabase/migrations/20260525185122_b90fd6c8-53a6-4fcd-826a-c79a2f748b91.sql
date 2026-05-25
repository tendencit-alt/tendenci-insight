CREATE OR REPLACE FUNCTION public.production_metrics(
  p_type_id uuid DEFAULT NULL::uuid,
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  v_tenant uuid := public.get_user_tenant_id();
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'aguardando', COUNT(*) FILTER (WHERE status = 'aguardando'),
    'em_andamento', COUNT(*) FILTER (WHERE status = 'em_andamento'),
    'concluido', COUNT(*) FILTER (WHERE status = 'concluido'),
    'pausado', COUNT(*) FILTER (WHERE status = 'pausado'),
    'cancelado', COUNT(*) FILTER (WHERE status = 'cancelado'),
    'valor_total', COALESCE(SUM(value), 0),
    'valor_aguardando', COALESCE(SUM(value) FILTER (WHERE status = 'aguardando'), 0),
    'valor_em_andamento', COALESCE(SUM(value) FILTER (WHERE status = 'em_andamento'), 0),
    'valor_concluido', COALESCE(SUM(value) FILTER (WHERE status = 'concluido'), 0),
    'atrasadas_prazo', COUNT(*) FILTER (
      WHERE planned_end_date < NOW()
      AND status NOT IN ('concluido', 'cancelado')
    ),
    'urgente', COUNT(*) FILTER (WHERE priority = 'urgente'),
    'alta', COUNT(*) FILTER (WHERE priority = 'alta'),
    'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
    'baixa', COUNT(*) FILTER (WHERE priority = 'baixa'),
    'concluidas_no_prazo', COUNT(*) FILTER (
      WHERE status = 'concluido'
      AND (actual_end_date IS NULL OR planned_end_date IS NULL OR actual_end_date <= planned_end_date)
    ),
    'total_concluidas', COUNT(*) FILTER (WHERE status = 'concluido')
  ) INTO result
  FROM production_orders
  WHERE tenant_id = v_tenant
    AND (p_type_id IS NULL OR production_type_id = p_type_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.production_metrics(
  p_type_id uuid DEFAULT NULL::uuid,
  p_status text DEFAULT NULL::text,
  p_priority text DEFAULT NULL::text,
  p_responsible_id uuid DEFAULT NULL::uuid,
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_tenant uuid := public.get_user_tenant_id();
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'aguardando', COUNT(*) FILTER (WHERE po.status = 'aguardando'),
    'em_andamento', COUNT(*) FILTER (WHERE po.status = 'em_andamento'),
    'concluido', COUNT(*) FILTER (WHERE po.status = 'concluido'),
    'pausado', COUNT(*) FILTER (WHERE po.status = 'pausado'),
    'cancelado', COUNT(*) FILTER (WHERE po.status = 'cancelado'),
    'valor_total', COALESCE(SUM(po.value), 0),
    'valor_aguardando', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'aguardando'), 0),
    'valor_em_andamento', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'em_andamento'), 0),
    'valor_concluido', COALESCE(SUM(po.value) FILTER (WHERE po.status = 'concluido'), 0),
    'atrasadas_prazo', COUNT(*) FILTER (WHERE po.planned_end_date < NOW() AND po.status NOT IN ('concluido', 'cancelado')),
    'urgente', COUNT(*) FILTER (WHERE po.priority = 'urgente' AND po.status NOT IN ('concluido', 'cancelado')),
    'alta', COUNT(*) FILTER (WHERE po.priority = 'alta' AND po.status NOT IN ('concluido', 'cancelado')),
    'normal', COUNT(*) FILTER (WHERE po.priority = 'normal' AND po.status NOT IN ('concluido', 'cancelado')),
    'baixa', COUNT(*) FILTER (WHERE po.priority = 'baixa' AND po.status NOT IN ('concluido', 'cancelado')),
    'concluidas_no_prazo', COUNT(*) FILTER (WHERE po.status = 'concluido' AND (po.actual_end_date IS NULL OR po.actual_end_date <= po.planned_end_date)),
    'total_concluidas', COUNT(*) FILTER (WHERE po.status = 'concluido')
  ) INTO v_result
  FROM production_orders po
  WHERE po.tenant_id = v_tenant
    AND (p_type_id IS NULL OR po.production_type_id = p_type_id)
    AND (p_status IS NULL OR p_status = 'all' OR po.status = p_status)
    AND (p_priority IS NULL OR p_priority = 'all' OR po.priority = p_priority)
    AND (p_responsible_id IS NULL OR po.responsible_id = p_responsible_id)
    AND (p_date_from IS NULL OR po.created_at >= p_date_from)
    AND (p_date_to IS NULL OR po.created_at <= p_date_to);

  RETURN v_result;
END;
$function$;