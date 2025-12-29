-- Adicionar constraint UNIQUE para permitir upsert correto
-- Primeiro, remover duplicatas se existirem
DELETE FROM followup_logs a USING followup_logs b
WHERE a.id < b.id 
  AND a.deal_id = b.deal_id 
  AND a.followup_number = b.followup_number;

-- Adicionar a constraint UNIQUE
ALTER TABLE followup_logs 
ADD CONSTRAINT followup_logs_deal_followup_unique 
UNIQUE (deal_id, followup_number);