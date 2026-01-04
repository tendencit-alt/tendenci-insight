-- Corrigir números de telefone de clientes que começam com zeros
UPDATE clients 
SET phone = REGEXP_REPLACE(phone, '^0+', '')
WHERE phone IS NOT NULL AND phone ~ '^0';

-- Corrigir whatsapp_number em tarefas pendentes/falhas
UPDATE crm_tasks 
SET whatsapp_number = REGEXP_REPLACE(whatsapp_number, '^0+', '')
WHERE whatsapp_number IS NOT NULL 
  AND whatsapp_number ~ '^0' 
  AND status IN ('open', 'failed', 'pendente');

-- Corrigir telefones de arquitetos que começam com zeros
UPDATE architects
SET phone = REGEXP_REPLACE(phone, '^0+', '')
WHERE phone IS NOT NULL AND phone ~ '^0';