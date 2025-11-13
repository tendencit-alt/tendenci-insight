-- Corrigir foreign key constraint para permitir exclusão de leads
-- Remover constraint antiga
ALTER TABLE crm_deals 
DROP CONSTRAINT IF EXISTS crm_deals_lead_id_fkey;

-- Adicionar constraint com CASCADE DELETE
-- Quando um lead for deletado, todos os deals associados também serão deletados
ALTER TABLE crm_deals 
ADD CONSTRAINT crm_deals_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES leads(id) 
ON DELETE CASCADE;