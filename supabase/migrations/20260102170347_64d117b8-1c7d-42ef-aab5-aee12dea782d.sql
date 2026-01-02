-- Dropar funções existentes
DROP FUNCTION IF EXISTS public.get_campaign_metrics(timestamp with time zone, timestamp with time zone, uuid);
DROP FUNCTION IF EXISTS public.get_campaign_evolution(timestamp with time zone, timestamp with time zone, uuid);
DROP FUNCTION IF EXISTS public.get_campaign_vendor_comparison(timestamp with time zone, timestamp with time zone);

-- Recriar função get_campaign_metrics
CREATE FUNCTION public.get_campaign_metrics(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_campanhas', (
      SELECT COUNT(DISTINCT c.id)
      FROM tendenci_prospec_arq_campaigns c
      INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campaign_id = c.id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_envios', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND ca.status = 'enviado'
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_respostas', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND ca.respondeu = true
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_convertidos', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND ca.interessado = true
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'taxa_resposta', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ca.respondeu = true)::numeric / COUNT(*) FILTER (WHERE ca.status = 'enviado')::numeric) * 100, 1)
        ELSE 0 
      END
      FROM tendenci_prospec_arq_campaign_architects ca
      INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'taxa_conversao', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE ca.respondeu = true) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ca.interessado = true)::numeric / COUNT(*) FILTER (WHERE ca.respondeu = true)::numeric) * 100, 1)
        ELSE 0 
      END
      FROM tendenci_prospec_arq_campaign_architects ca
      INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
      WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

-- Recriar função get_campaign_evolution
CREATE FUNCTION public.get_campaign_evolution(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(evolution ORDER BY evolution.data), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      ca.data_envio::date as data,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as envios,
      COUNT(*) FILTER (WHERE ca.respondeu = true) as respostas,
      COUNT(*) FILTER (WHERE ca.interessado = true) as convertidos
    FROM tendenci_prospec_arq_campaign_architects ca
    INNER JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campaign_id
    WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
      AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    GROUP BY ca.data_envio::date
    ORDER BY ca.data_envio::date
  ) evolution;
  
  RETURN v_result;
END;
$function$;

-- Recriar função get_campaign_vendor_comparison
CREATE FUNCTION public.get_campaign_vendor_comparison(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(vendor_data ORDER BY vendor_data.total_envios DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      p.id as vendedor_id,
      p.full_name as vendedor_nome,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as total_envios,
      COUNT(*) FILTER (WHERE ca.respondeu = true) as total_respostas,
      COUNT(*) FILTER (WHERE ca.interessado = true) as total_convertidos,
      CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ca.respondeu = true)::numeric / COUNT(*) FILTER (WHERE ca.status = 'enviado')::numeric) * 100, 1)
        ELSE 0 
      END as taxa_resposta,
      CASE 
        WHEN COUNT(*) FILTER (WHERE ca.respondeu = true) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ca.interessado = true)::numeric / COUNT(*) FILTER (WHERE ca.respondeu = true)::numeric) * 100, 1)
        ELSE 0 
      END as taxa_conversao
    FROM profiles p
    INNER JOIN tendenci_prospec_arq_campaigns c ON c.vendedor_id = p.id
    INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campaign_id = c.id
    WHERE ca.data_envio BETWEEN p_start_date AND p_end_date
    GROUP BY p.id, p.full_name
  ) vendor_data;
  
  RETURN v_result;
END;
$function$;