
-- Fase 3: Adicionar campo whatsapp_valido para marcar arquitetos com telefone inválido
ALTER TABLE architects ADD COLUMN IF NOT EXISTS whatsapp_valido BOOLEAN DEFAULT true;

-- Marcar como inválido arquitetos que tiveram erros de telefone
UPDATE architects 
SET whatsapp_valido = false
WHERE id IN (
  SELECT DISTINCT architect_id 
  FROM tendenci_prospec_arq_logs 
  WHERE tipo IN ('numero_inexistente', 'erro_formatacao')
  AND architect_id IS NOT NULL
);
