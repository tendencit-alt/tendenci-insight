-- =====================================================
-- CORREÇÃO DE DADOS HISTÓRICOS E RPCs DE CAMPANHAS
-- =====================================================

-- 1. Corrigir dados históricos: mover arquitetos que foram automaticamente 
--    colocados em 'contato_iniciado' de volta para 'adicionar_epata'
--    (apenas os que não responderam - respondeu = false ou NULL)
UPDATE architects a
SET status_funil = 'adicionar_epata'
WHERE a.status_funil = 'contato_iniciado'
  AND EXISTS (
    SELECT 1 FROM tendenci_prospec_arq_campaign_architects ca
    WHERE ca.architect_id = a.id
    AND (ca.respondeu = false OR ca.respondeu IS NULL)
  );

-- 2. Dropar funções existentes para recriar com novos parâmetros
DROP FUNCTION IF EXISTS get_campaign_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_campaign_vendor_comparison(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_campaign_evolution(TIMESTAMPTZ, TIMESTAMPTZ, UUID);

-- 3. Criar RPC get_campaign_metrics com lógica correta
CREATE OR REPLACE FUNCTION get_campaign_metrics(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT json_build_object(
    'total_campanhas', (
      SELECT COUNT(DISTINCT c.id)
      FROM tendenci_prospec_arq_campaigns c
      WHERE c.created_at BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_enviados', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status = 'enviado'
        AND ca.data_envio BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_falhas', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status IN ('erro', 'numero_inexistente', 'erro_formatacao', 'erro_envio')
        AND ca.data_envio BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'taxa_entrega', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
        ELSE 0 
      END
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.data_envio BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_respostas', (
      SELECT COUNT(DISTINCT ca.architect_id)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      JOIN architects a ON a.id = ca.architect_id
      WHERE ca.status = 'enviado'
        AND ca.data_envio BETWEEN v_start_date AND v_end_date
        AND a.status_funil = 'contato_iniciado'
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'taxa_resposta', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 THEN 
          ROUND(
            (COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'contato_iniciado')::NUMERIC 
            / COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC) * 100, 
            1
          )
        ELSE 0 
      END
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      JOIN architects a ON a.id = ca.architect_id
      WHERE ca.data_envio BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'total_convertidos', (
      SELECT COUNT(DISTINCT ca.architect_id)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      JOIN architects a ON a.id = ca.architect_id
      WHERE ca.status = 'enviado'
        AND ca.data_envio BETWEEN v_start_date AND v_end_date
        AND a.status_funil = 'parceiro_ativo'
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    ),
    'taxa_conversao', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 THEN 
          ROUND(
            (COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'parceiro_ativo')::NUMERIC 
            / COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC) * 100, 
            1
          )
        ELSE 0 
      END
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      JOIN architects a ON a.id = ca.architect_id
      WHERE ca.data_envio BETWEEN v_start_date AND v_end_date
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 4. Criar RPC get_campaign_vendor_comparison
CREATE OR REPLACE FUNCTION get_campaign_vendor_comparison(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT COALESCE(json_agg(vendor_data ORDER BY vendor_data.total_enviados DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      p.id as vendedor_id,
      p.full_name as vendedor_nome,
      COUNT(DISTINCT c.id) as total_campanhas,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as total_enviados,
      COUNT(*) FILTER (WHERE ca.status IN ('erro', 'numero_inexistente', 'erro_formatacao', 'erro_envio')) as total_falhas,
      COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'contato_iniciado') as total_respostas,
      COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'parceiro_ativo') as total_convertidos,
      CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 THEN 
          ROUND(
            (COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'contato_iniciado')::NUMERIC 
            / COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC) * 100, 
            1
          )
        ELSE 0 
      END as taxa_resposta,
      CASE 
        WHEN COUNT(*) FILTER (WHERE ca.status = 'enviado') > 0 THEN 
          ROUND(
            (COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'parceiro_ativo')::NUMERIC 
            / COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC) * 100, 
            1
          )
        ELSE 0 
      END as taxa_conversao
    FROM profiles p
    JOIN tendenci_prospec_arq_campaigns c ON c.vendedor_id = p.id
    JOIN tendenci_prospec_arq_campaign_architects ca ON ca.campanha_id = c.id
    JOIN architects a ON a.id = ca.architect_id
    WHERE ca.data_envio BETWEEN v_start_date AND v_end_date
    GROUP BY p.id, p.full_name
  ) vendor_data;

  RETURN v_result;
END;
$$;

-- 5. Criar RPC get_campaign_evolution
CREATE OR REPLACE FUNCTION get_campaign_evolution(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  SELECT COALESCE(json_agg(daily_data ORDER BY daily_data.data), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      DATE(ca.data_envio) as data,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as enviados,
      COUNT(*) FILTER (WHERE ca.status IN ('erro', 'numero_inexistente', 'erro_formatacao', 'erro_envio')) as falhas,
      COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'contato_iniciado') as respostas,
      COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado' AND a.status_funil = 'parceiro_ativo') as convertidos
    FROM tendenci_prospec_arq_campaign_architects ca
    JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
    JOIN architects a ON a.id = ca.architect_id
    WHERE ca.data_envio BETWEEN v_start_date AND v_end_date
      AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id)
    GROUP BY DATE(ca.data_envio)
  ) daily_data;

  RETURN v_result;
END;
$$;