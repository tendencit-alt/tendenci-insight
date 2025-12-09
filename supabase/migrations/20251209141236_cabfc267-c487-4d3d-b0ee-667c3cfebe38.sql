-- =====================================================
-- LIMPEZA E CORREÇÃO DO MÓDULO DE CAMPANHAS
-- =====================================================

-- 1. Limpar itens cancelados antigos da fila (>7 dias)
DELETE FROM tendenci_campaign_queue 
WHERE status = 'cancelado' 
AND created_at < NOW() - INTERVAL '7 days';

-- 2. Marcar arquitetos com 2+ erros de telefone como whatsapp_valido = false
UPDATE architects
SET whatsapp_valido = false
WHERE id IN (
  SELECT architect_id
  FROM tendenci_prospec_arq_logs
  WHERE tipo IN ('numero_inexistente', 'erro_formatacao')
  AND architect_id IS NOT NULL
  GROUP BY architect_id
  HAVING COUNT(*) >= 2
);

-- 3. Contar quantos arquitetos foram marcados
DO $$
DECLARE
  count_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_updated
  FROM architects 
  WHERE whatsapp_valido = false;
  
  RAISE NOTICE 'Arquitetos marcados com whatsapp_valido = false: %', count_updated;
END $$;

-- 4. Adicionar índice para busca de logs por tipo (melhora performance)
CREATE INDEX IF NOT EXISTS idx_prospec_logs_tipo_architect 
ON tendenci_prospec_arq_logs(tipo, architect_id) 
WHERE architect_id IS NOT NULL;

-- 5. Adicionar índice para busca de fila por status e agendamento (melhora performance)
CREATE INDEX IF NOT EXISTS idx_campaign_queue_status_agendado 
ON tendenci_campaign_queue(status, agendado_para) 
WHERE status = 'pendente';