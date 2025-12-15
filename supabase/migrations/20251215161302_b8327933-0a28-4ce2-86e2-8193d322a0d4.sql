
-- Corrigir cálculos de taxa_resposta e taxa_conversao
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, NOW() - INTERVAL '30 days');
  v_date_to := COALESCE(p_date_to, NOW());

  SELECT json_build_object(
    'total_campanhas', (
      SELECT COUNT(DISTINCT c.id)
      FROM tendenci_prospec_arq_campaigns c
      WHERE c.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    'mensagens_enviadas', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status IN ('enviado', 'erro')
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    'total_erros', (
      SELECT COUNT(*)
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status = 'erro'
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    -- Respostas = arquitetos que receberam campanha E estão em contato_iniciado OU parceiro_ativo
    'respostas', (
      SELECT COUNT(DISTINCT a.id)
      FROM architects a
      INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.architect_id = a.id
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status = 'enviado'
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND a.status_funil IN ('contato_iniciado', 'parceiro_ativo')
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    -- Convertidos = arquitetos que receberam campanha E estão em parceiro_ativo
    'convertidos', (
      SELECT COUNT(DISTINCT a.id)
      FROM architects a
      INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.architect_id = a.id
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status = 'enviado'
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND a.status_funil = 'parceiro_ativo'
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    'taxa_entrega', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(*) FILTER (WHERE ca.status = 'enviado')::NUMERIC / COUNT(*)::NUMERIC) * 100
          ELSE 0 
        END, 1
      )
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status IN ('enviado', 'erro')
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    -- Taxa de resposta = (contato_iniciado + parceiro_ativo) / total enviados
    'taxa_resposta', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado') > 0 
          THEN (
            COUNT(DISTINCT a.id) FILTER (
              WHERE ca.status = 'enviado' 
              AND a.status_funil IN ('contato_iniciado', 'parceiro_ativo')
            )::NUMERIC / 
            COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado')::NUMERIC
          ) * 100
          ELSE 0 
        END, 1
      )
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      LEFT JOIN architects a ON a.id = ca.architect_id
      WHERE ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    -- Taxa de conversão = parceiro_ativo / total enviados
    'taxa_conversao', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado') > 0 
          THEN (
            COUNT(DISTINCT a.id) FILTER (
              WHERE ca.status = 'enviado' 
              AND a.status_funil = 'parceiro_ativo'
            )::NUMERIC / 
            COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado')::NUMERIC
          ) * 100
          ELSE 0 
        END, 1
      )
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      LEFT JOIN architects a ON a.id = ca.architect_id
      WHERE ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
