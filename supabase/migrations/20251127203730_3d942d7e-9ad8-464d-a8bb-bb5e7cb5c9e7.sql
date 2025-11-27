-- Fase 1: Habilitar Realtime nas tabelas de campanha
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_campaign_dispatches;
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_campaign_queue;

-- Fase 5: Limpar dados corrompidos

-- Marcar dispatches antigos "em_andamento" como erro
UPDATE tendenci_campaign_dispatches 
SET 
  status = 'erro', 
  erro_mensagem = 'Campanha travada - limpa automaticamente pelo sistema',
  concluido_em = NOW(),
  updated_at = NOW()
WHERE status = 'em_andamento' 
  AND updated_at < NOW() - INTERVAL '2 hours';

-- Cancelar itens da fila de dispatches cancelados
UPDATE tendenci_campaign_queue 
SET status = 'cancelado'
WHERE dispatch_id IN (
  SELECT id FROM tendenci_campaign_dispatches WHERE status = 'cancelado'
) AND status = 'pendente';