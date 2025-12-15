-- Corrigir RPC para usar nomes corretos das tabelas
DROP FUNCTION IF EXISTS get_campaign_vendor_comparison(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_campaign_vendor_comparison(
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS TABLE (
  vendedor_id UUID,
  vendedor_nome TEXT,
  total_campanhas BIGINT,
  mensagens_enviadas BIGINT,
  respostas BIGINT,
  convertidos BIGINT,
  taxa_resposta NUMERIC,
  taxa_conversao NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH campaign_stats AS (
    SELECT 
      c.vendedor_id,
      COUNT(DISTINCT c.id) as campanhas,
      COUNT(DISTINCT CASE WHEN cd.status = 'concluido' THEN cd.id END) as enviados
    FROM tendenci_prospec_arq_campaigns c
    LEFT JOIN tendenci_prospec_arq_campaign_dispatches cd ON cd.campanha_id = c.id
    WHERE c.created_at >= p_date_from 
      AND c.created_at <= p_date_to
      AND c.vendedor_id IS NOT NULL
    GROUP BY c.vendedor_id
  ),
  architect_response_stats AS (
    SELECT 
      c.vendedor_id,
      COUNT(DISTINCT CASE 
        WHEN a.status_funil IN ('contato_iniciado', 'parceiro_ativo') 
        THEN ca.architect_id 
      END) as respostas,
      COUNT(DISTINCT CASE 
        WHEN a.status_funil = 'parceiro_ativo' 
        THEN ca.architect_id 
      END) as convertidos
    FROM tendenci_prospec_arq_campaigns c
    JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
    JOIN architects a ON a.id = ca.architect_id
    WHERE c.created_at >= p_date_from 
      AND c.created_at <= p_date_to
      AND c.vendedor_id IS NOT NULL
    GROUP BY c.vendedor_id
  )
  SELECT 
    p.id as vendedor_id,
    p.full_name as vendedor_nome,
    COALESCE(cs.campanhas, 0)::BIGINT as total_campanhas,
    COALESCE(cs.enviados, 0)::BIGINT as mensagens_enviadas,
    COALESCE(ars.respostas, 0)::BIGINT as respostas,
    COALESCE(ars.convertidos, 0)::BIGINT as convertidos,
    CASE 
      WHEN COALESCE(cs.enviados, 0) > 0 
      THEN ROUND((COALESCE(ars.respostas, 0)::NUMERIC / cs.enviados) * 100, 1)
      ELSE 0 
    END as taxa_resposta,
    CASE 
      WHEN COALESCE(cs.enviados, 0) > 0 
      THEN ROUND((COALESCE(ars.convertidos, 0)::NUMERIC / cs.enviados) * 100, 1)
      ELSE 0 
    END as taxa_conversao
  FROM profiles p
  LEFT JOIN campaign_stats cs ON cs.vendedor_id = p.id
  LEFT JOIN architect_response_stats ars ON ars.vendedor_id = p.id
  WHERE p.role IN ('vendedor', 'admin')
    AND (cs.campanhas > 0 OR ars.respostas > 0)
  ORDER BY COALESCE(cs.enviados, 0) DESC;
END;
$$;