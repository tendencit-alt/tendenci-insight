-- 1. Corrigir get_campaign_metrics
DROP FUNCTION IF EXISTS get_campaign_metrics(timestamptz, timestamptz, uuid);

CREATE OR REPLACE FUNCTION get_campaign_metrics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_campanhas BIGINT,
  total_envios BIGINT,
  total_respostas BIGINT,
  total_convertidos BIGINT,
  taxa_resposta NUMERIC,
  taxa_conversao NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::bigint,
    COUNT(ca.id)::bigint,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint,
    CASE 
      WHEN COUNT(ca.id) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric / COUNT(ca.id)::numeric) * 100, 2)
      ELSE 0 
    END,
    CASE 
      WHEN COUNT(CASE WHEN ca.respondeu = true THEN 1 END) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.interessado = true THEN 1 END)::numeric / COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric) * 100, 2)
      ELSE 0 
    END
  FROM tendenci_prospec_arq_campaigns c
  LEFT JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
  WHERE c.created_at >= p_start_date
    AND c.created_at <= p_end_date
    AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id);
END;
$$;

-- 2. Corrigir get_campaign_evolution
DROP FUNCTION IF EXISTS get_campaign_evolution(timestamptz, timestamptz, uuid);

CREATE OR REPLACE FUNCTION get_campaign_evolution(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  data DATE,
  envios BIGINT,
  respostas BIGINT,
  convertidos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ca.data_envio),
    COUNT(ca.id)::bigint,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint
  FROM tendenci_prospec_arq_campaign_architects ca
  JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
  WHERE ca.data_envio >= p_start_date
    AND ca.data_envio <= p_end_date
    AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
  GROUP BY DATE(ca.data_envio)
  ORDER BY DATE(ca.data_envio);
END;
$$;

-- 3. Corrigir get_campaign_vendor_comparison (remover duplicadas)
DROP FUNCTION IF EXISTS get_campaign_vendor_comparison(timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS get_campaign_vendor_comparison(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_campaign_vendor_comparison(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  vendedor_id UUID,
  vendedor_nome TEXT,
  total_envios BIGINT,
  total_respostas BIGINT,
  taxa_resposta NUMERIC,
  total_convertidos BIGINT,
  taxa_conversao NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    COUNT(ca.id)::bigint,
    COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::bigint,
    CASE 
      WHEN COUNT(ca.id) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric / COUNT(ca.id)::numeric) * 100, 2)
      ELSE 0 
    END,
    COUNT(CASE WHEN ca.interessado = true THEN 1 END)::bigint,
    CASE 
      WHEN COUNT(CASE WHEN ca.respondeu = true THEN 1 END) > 0 
      THEN ROUND((COUNT(CASE WHEN ca.interessado = true THEN 1 END)::numeric / COUNT(CASE WHEN ca.respondeu = true THEN 1 END)::numeric) * 100, 2)
      ELSE 0 
    END
  FROM profiles p
  JOIN tendenci_prospec_arq_campaigns c ON c.vendedor_id = p.id
  JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
  WHERE ca.data_envio >= p_start_date
    AND ca.data_envio <= p_end_date
    AND (p_vendedor_id IS NULL OR p.id = p_vendedor_id)
  GROUP BY p.id, p.full_name
  ORDER BY COUNT(ca.id) DESC;
END;
$$;