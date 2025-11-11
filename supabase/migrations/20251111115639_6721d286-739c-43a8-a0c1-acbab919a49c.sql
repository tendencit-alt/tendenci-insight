-- Remover a constraint antiga que aponta para auth.users
ALTER TABLE crm_deals DROP CONSTRAINT crm_deals_owner_id_fkey;

-- Adicionar nova constraint apontando para profiles
ALTER TABLE crm_deals 
  ADD CONSTRAINT crm_deals_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;