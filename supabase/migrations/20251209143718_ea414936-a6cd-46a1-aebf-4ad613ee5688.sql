-- =====================================================
-- CORREÇÃO DE DISPATCHES CANCELADOS COM SUCESSO PARCIAL
-- =====================================================

-- 1. Marcar dispatches "cancelado" que tiveram algum sucesso como "concluido"
UPDATE tendenci_campaign_dispatches
SET 
  status = 'concluido',
  concluido_em = COALESCE(updated_at, NOW()),
  progresso_percentual = CASE 
    WHEN total_arquitetos > 0 THEN 
      ROUND(((enviados_sucesso + enviados_erro)::numeric / total_arquitetos) * 100)
    ELSE 100 
  END
WHERE status = 'cancelado'
AND enviados_sucesso > 0;

-- 2. Marcar dispatches "em_andamento" travados há mais de 6 horas como "erro"
UPDATE tendenci_campaign_dispatches
SET 
  status = 'erro',
  erro_mensagem = 'Campanha travada - sem atividade por mais de 6 horas',
  concluido_em = NOW()
WHERE status = 'em_andamento'
AND updated_at < NOW() - INTERVAL '6 hours';

-- 3. Sincronizar status das campanhas com seus dispatches
-- Se dispatch está concluído, campanha deve estar "enviado"
UPDATE tendenci_prospec_arq_campaigns c
SET status = 'enviado'
FROM tendenci_campaign_dispatches d
WHERE d.campanha_id = c.id
AND d.status = 'concluido'
AND c.status NOT IN ('enviado', 'erro');

-- 4. Se dispatch tem erro, campanha deve ter status "erro"
UPDATE tendenci_prospec_arq_campaigns c
SET status = 'erro'
FROM tendenci_campaign_dispatches d
WHERE d.campanha_id = c.id
AND d.status = 'erro'
AND c.status != 'erro';