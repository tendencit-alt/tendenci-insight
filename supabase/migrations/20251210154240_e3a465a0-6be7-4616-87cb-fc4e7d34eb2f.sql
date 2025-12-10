-- Fase 1: Sincronizar dados históricos - marcar arquitetos que já converteram
UPDATE tendenci_prospec_arq_campaign_architects ca
SET respondeu = true, 
    data_resposta = COALESCE(ca.data_resposta, a.data_ultimo_contato, NOW())
FROM architects a
WHERE ca.architect_id = a.id
  AND ca.status = 'enviado'
  AND ca.respondeu = false
  AND a.status_funil = 'parceiro_ativo';

-- Fase 2: Atualizar RPC get_campaign_metrics para considerar conversões
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(p_date_from timestamp with time zone, p_date_to timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_total_campanhas BIGINT;
  v_mensagens_enviadas BIGINT;
  v_total_erros BIGINT;
  v_respostas BIGINT;
  v_convertidos BIGINT;
  v_taxa_entrega NUMERIC;
  v_taxa_resposta NUMERIC;
  v_taxa_conversao NUMERIC;
BEGIN
  -- Total de campanhas enviadas no período
  SELECT COUNT(*) INTO v_total_campanhas
  FROM tendenci_prospec_arq_campaigns
  WHERE status IN ('enviado', 'concluido')
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- Mensagens enviadas com sucesso
  SELECT COUNT(*) INTO v_mensagens_enviadas
  FROM tendenci_prospec_arq_campaign_architects
  WHERE status = 'enviado'
    AND data_envio BETWEEN p_date_from AND p_date_to;

  -- Total de erros
  SELECT COUNT(*) INTO v_total_erros
  FROM tendenci_prospec_arq_campaign_architects
  WHERE status IN ('erro', 'numero_inexistente', 'erro_formatacao', 'erro_envio')
    AND (data_envio BETWEEN p_date_from AND p_date_to OR created_at BETWEEN p_date_from AND p_date_to);

  -- Respostas recebidas (respondeu=true OU arquiteto convertido para parceiro_ativo)
  SELECT COUNT(DISTINCT ca.architect_id) INTO v_respostas
  FROM tendenci_prospec_arq_campaign_architects ca
  LEFT JOIN architects a ON a.id = ca.architect_id
  WHERE ca.status = 'enviado'
    AND ca.data_envio BETWEEN p_date_from AND p_date_to
    AND (ca.respondeu = true OR a.status_funil = 'parceiro_ativo');

  -- Arquitetos que converteram para parceiro_ativo após campanha
  SELECT COUNT(DISTINCT a.id) INTO v_convertidos
  FROM architects a
  INNER JOIN tendenci_prospec_arq_campaign_architects ca ON a.id = ca.architect_id
  WHERE a.status_funil = 'parceiro_ativo'
    AND ca.status = 'enviado'
    AND ca.data_envio BETWEEN p_date_from AND p_date_to;

  -- Calcular taxas
  v_taxa_entrega := CASE 
    WHEN (v_mensagens_enviadas + v_total_erros) > 0 
    THEN ROUND((v_mensagens_enviadas::NUMERIC / (v_mensagens_enviadas + v_total_erros)) * 100, 1)
    ELSE 0 
  END;

  v_taxa_resposta := CASE 
    WHEN v_mensagens_enviadas > 0 
    THEN ROUND((v_respostas::NUMERIC / v_mensagens_enviadas) * 100, 1)
    ELSE 0 
  END;

  v_taxa_conversao := CASE 
    WHEN v_mensagens_enviadas > 0 
    THEN ROUND((v_convertidos::NUMERIC / v_mensagens_enviadas) * 100, 1)
    ELSE 0 
  END;

  -- Construir resultado
  SELECT json_build_object(
    'total_campanhas', v_total_campanhas,
    'mensagens_enviadas', v_mensagens_enviadas,
    'total_erros', v_total_erros,
    'respostas', v_respostas,
    'convertidos', v_convertidos,
    'taxa_entrega', v_taxa_entrega,
    'taxa_resposta', v_taxa_resposta,
    'taxa_conversao', v_taxa_conversao
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Fase 3: Atualizar RPC get_campaign_evolution para dados mais precisos
CREATE OR REPLACE FUNCTION public.get_campaign_evolution(p_date_from timestamp with time zone, p_date_to timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(daily ORDER BY daily.data), '[]'::json) INTO v_result
  FROM (
    SELECT 
      date_trunc('day', ca.data_envio)::date as data,
      COUNT(*) FILTER (WHERE ca.status = 'enviado') as enviados,
      COUNT(*) FILTER (WHERE ca.respondeu = true OR a.status_funil = 'parceiro_ativo') as respostas,
      COUNT(*) FILTER (WHERE ca.status IN ('erro', 'numero_inexistente', 'erro_formatacao')) as erros
    FROM tendenci_prospec_arq_campaign_architects ca
    LEFT JOIN architects a ON a.id = ca.architect_id
    WHERE ca.data_envio BETWEEN p_date_from AND p_date_to
    GROUP BY date_trunc('day', ca.data_envio)::date
    ORDER BY data
  ) daily;

  RETURN v_result;
END;
$function$;