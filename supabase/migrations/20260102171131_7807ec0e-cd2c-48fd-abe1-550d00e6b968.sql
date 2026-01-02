-- Drop and recreate all campaign RPC functions with correct column name (campanha_id instead of campaign_id)

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS get_campaign_metrics(timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS get_campaign_evolution(timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS get_campaign_vendor_comparison(timestamptz, timestamptz, uuid);

-- 2. Recreate get_campaign_metrics with correct column
CREATE OR REPLACE FUNCTION get_campaign_metrics(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_campanhas bigint,
  total_envios bigint,
  total_respostas bigint,
  total_convertidos bigint,
  taxa_resposta numeric,
  taxa_conversao numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::bigint as total_campanhas,
    COUNT(ca.id)::bigint as total_envios,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint as total_respostas,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint as total_convertidos,
    CASE 
      WHEN COUNT(ca.id) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric / COUNT(ca.id)::numeric) * 100, 2)
      ELSE 0 
    END as taxa_resposta,
    CASE 
      WHEN COUNT(CASE WHEN ca.respondeu = true THEN 1 END) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.interessado = true THEN 1 END)::numeric / COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric) * 100, 2)
      ELSE 0 
    END as taxa_conversao
  FROM tendenci_prospec_arq_campaigns c
  LEFT JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
  WHERE c.created_at >= p_start_date
    AND c.created_at <= p_end_date
    AND (p_vendedor_id IS NULL OR c.criado_por = p_vendedor_id);
END;
$$;

-- 3. Recreate get_campaign_evolution with correct column
CREATE OR REPLACE FUNCTION get_campaign_evolution(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  data date,
  envios bigint,
  respostas bigint,
  convertidos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ca.data_envio) as data,
    COUNT(ca.id)::bigint as envios,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint as respostas,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint as convertidos
  FROM tendenci_prospec_arq_campaign_architects ca
  JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
  WHERE ca.data_envio >= p_start_date
    AND ca.data_envio <= p_end_date
    AND (p_vendedor_id IS NULL OR c.criado_por = p_vendedor_id)
  GROUP BY DATE(ca.data_envio)
  ORDER BY DATE(ca.data_envio);
END;
$$;

-- 4. Recreate get_campaign_vendor_comparison with correct column
CREATE OR REPLACE FUNCTION get_campaign_vendor_comparison(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_vendedor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  vendedor_id uuid,
  vendedor_nome text,
  total_envios bigint,
  total_respostas bigint,
  taxa_resposta numeric,
  total_convertidos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as vendedor_id,
    p.full_name as vendedor_nome,
    COUNT(ca.id)::bigint as total_envios,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint as total_respostas,
    CASE 
      WHEN COUNT(ca.id) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric / COUNT(ca.id)::numeric) * 100, 2)
      ELSE 0 
    END as taxa_resposta,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint as total_convertidos
  FROM profiles p
  JOIN tendenci_prospec_arq_campaigns c ON c.criado_por = p.id
  JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
  WHERE ca.data_envio >= p_start_date
    AND ca.data_envio <= p_end_date
    AND (p_vendedor_id IS NULL OR p.id = p_vendedor_id)
  GROUP BY p.id, p.full_name
  ORDER BY COUNT(ca.id) DESC;
END;
$$;