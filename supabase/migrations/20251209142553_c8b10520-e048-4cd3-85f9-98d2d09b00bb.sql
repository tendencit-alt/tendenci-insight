-- =====================================================
-- CORREÇÃO DE LOGS E ARQUITETOS COM NÚMEROS INVÁLIDOS
-- =====================================================

-- 1. Reclassificar logs antigos de erro_envio que são na verdade numero_inexistente
-- Detectar pela presença de "exists":false ou "exists": false no texto
UPDATE tendenci_prospec_arq_logs
SET tipo = 'numero_inexistente'
WHERE tipo = 'erro_envio'
AND (
  mensagem LIKE '%"exists":false%' 
  OR mensagem LIKE '%"exists": false%'
  OR mensagem LIKE '%exists":false%'
  OR mensagem LIKE '%not registered%'
);

-- 2. Marcar arquitetos com erros de número inexistente como whatsapp_valido = false
-- Mesmo com apenas 1 erro de numero_inexistente, marcar como inválido
UPDATE architects
SET whatsapp_valido = false
WHERE id IN (
  SELECT DISTINCT architect_id
  FROM tendenci_prospec_arq_logs
  WHERE tipo = 'numero_inexistente'
  AND architect_id IS NOT NULL
)
AND (whatsapp_valido IS NULL OR whatsapp_valido = true);

-- 3. Contar e reportar quantos foram atualizados
DO $$
DECLARE
  logs_reclassificados INTEGER;
  arquitetos_marcados INTEGER;
BEGIN
  -- Contar logs que foram reclassificados
  SELECT COUNT(*) INTO logs_reclassificados
  FROM tendenci_prospec_arq_logs
  WHERE tipo = 'numero_inexistente';
  
  -- Contar arquitetos com whatsapp inválido
  SELECT COUNT(*) INTO arquitetos_marcados
  FROM architects 
  WHERE whatsapp_valido = false;
  
  RAISE NOTICE 'Logs com tipo numero_inexistente: %', logs_reclassificados;
  RAISE NOTICE 'Arquitetos marcados com whatsapp_valido = false: %', arquitetos_marcados;
END $$;