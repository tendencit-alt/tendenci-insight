-- Corrigir RPC para filtrar corretamente por vendedor
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'respostas', (
      SELECT COUNT(DISTINCT a.id)
      FROM architects a
      INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.architect_id = a.id
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.status = 'enviado'
        AND ca.created_at BETWEEN v_date_from AND v_date_to
        AND (a.status_funil = 'parceiro_ativo' OR EXISTS (
          SELECT 1 FROM tendenci_prospec_arq_logs l 
          WHERE l.architect_id = a.id 
          AND l.respondeu = true
        ))
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    ),
    'convertidos', (
      SELECT COUNT(DISTINCT d.id)
      FROM crm_deals d
      INNER JOIN architects a ON a.id = d.architect_id
      INNER JOIN tendenci_prospec_arq_campaign_architects ca ON ca.architect_id = a.id
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE d.status = 'won'
        AND ca.status = 'enviado'
        AND ca.created_at BETWEEN v_date_from AND v_date_to
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
    'taxa_resposta', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado') > 0 
          THEN (
            COUNT(DISTINCT a.id) FILTER (
              WHERE ca.status = 'enviado' 
              AND (a.status_funil = 'parceiro_ativo' OR EXISTS (
                SELECT 1 FROM tendenci_prospec_arq_logs l 
                WHERE l.architect_id = a.id 
                AND l.respondeu = true
              ))
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
    'taxa_conversao', (
      SELECT ROUND(
        CASE 
          WHEN COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado') > 0 
          THEN (
            (SELECT COUNT(DISTINCT d.id)
             FROM crm_deals d
             INNER JOIN architects a2 ON a2.id = d.architect_id
             INNER JOIN tendenci_prospec_arq_campaign_architects ca2 ON ca2.architect_id = a2.id
             JOIN tendenci_prospec_arq_campaigns c2 ON c2.id = ca2.campanha_id
             WHERE d.status = 'won'
               AND ca2.status = 'enviado'
               AND ca2.created_at BETWEEN v_date_from AND v_date_to
               AND (p_vendedor_id IS NULL OR c2.vendedor_id = p_vendedor_id OR c2.created_by = p_vendedor_id)
            )::NUMERIC / 
            COUNT(DISTINCT ca.architect_id) FILTER (WHERE ca.status = 'enviado')::NUMERIC
          ) * 100
          ELSE 0 
        END, 1
      )
      FROM tendenci_prospec_arq_campaign_architects ca
      JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
      WHERE ca.created_at BETWEEN v_date_from AND v_date_to
        AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Corrigir RPC get_campaign_evolution também
CREATE OR REPLACE FUNCTION public.get_campaign_evolution(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, NOW() - INTERVAL '30 days');
  v_date_to := COALESCE(p_date_to, NOW());

  SELECT COALESCE(json_agg(daily ORDER BY daily.data), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      ca.created_at::date as data,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as enviados,
      COUNT(*) FILTER (WHERE ca.status = 'erro') as erros,
      COUNT(DISTINCT a.id) FILTER (
        WHERE ca.status = 'enviado' 
        AND (a.status_funil = 'parceiro_ativo' OR EXISTS (
          SELECT 1 FROM tendenci_prospec_arq_logs l 
          WHERE l.architect_id = a.id 
          AND l.respondeu = true
        ))
      ) as respostas
    FROM tendenci_prospec_arq_campaign_architects ca
    JOIN tendenci_prospec_arq_campaigns c ON c.id = ca.campanha_id
    LEFT JOIN architects a ON a.id = ca.architect_id
    WHERE ca.created_at BETWEEN v_date_from AND v_date_to
      AND (p_vendedor_id IS NULL OR c.vendedor_id = p_vendedor_id OR c.created_by = p_vendedor_id)
    GROUP BY ca.created_at::date
    ORDER BY ca.created_at::date
  ) daily;

  RETURN v_result;
END;
$$;