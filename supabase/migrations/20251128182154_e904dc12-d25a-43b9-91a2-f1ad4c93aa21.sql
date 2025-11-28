-- FASE 1: Adicionar campo user_id e vincular instâncias aos vendedores

-- 1. Adicionar campo user_id na tabela tendenci_whatsapp_connections
ALTER TABLE tendenci_whatsapp_connections 
ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Migrar dados existentes para vincular instâncias aos vendedores corretos
-- Maíra Guedes → user_id de Maíra
UPDATE tendenci_whatsapp_connections 
SET user_id = 'bbf765ae-10fe-4a56-9956-531641d2f633' 
WHERE instance_name = 'Maíra Guedes';

-- Pollyanna → user_id de Pollyana
UPDATE tendenci_whatsapp_connections 
SET user_id = '2f572303-3b1e-4ecb-9de4-cca0a25ffb4b' 
WHERE instance_name = 'Pollyanna';

-- Remover referências à instância "teste" nas campanhas antes de deletar
UPDATE tendenci_prospec_arq_campaigns 
SET whatsapp_connection_id = NULL 
WHERE whatsapp_connection_id IN (
  SELECT id FROM tendenci_whatsapp_connections WHERE instance_name = 'teste'
);

-- Agora pode deletar a instância de teste
DELETE FROM tendenci_whatsapp_connections WHERE instance_name = 'teste';

-- 3. Criar índice para otimizar JOINs nas queries do n8n
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id 
ON tendenci_whatsapp_connections(user_id);

-- 4. Atualizar RLS policies para filtrar por user_id
DROP POLICY IF EXISTS "Usuários autenticados podem ver instâncias WhatsApp" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários autenticados podem criar instâncias WhatsApp" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar instâncias WhatsApp" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar instâncias WhatsApp" ON tendenci_whatsapp_connections;

-- Vendedores veem apenas suas próprias instâncias, admins veem todas
CREATE POLICY "Usuários veem próprias instâncias, admins veem todas"
ON tendenci_whatsapp_connections FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Usuários podem criar instâncias apenas para si mesmos
CREATE POLICY "Usuários criam próprias instâncias"
ON tendenci_whatsapp_connections FOR INSERT
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Usuários podem atualizar apenas suas próprias instâncias, admins atualizam todas
CREATE POLICY "Usuários atualizam próprias instâncias, admins atualizam todas"
ON tendenci_whatsapp_connections FOR UPDATE
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Usuários podem deletar apenas suas próprias instâncias, admins deletam todas
CREATE POLICY "Usuários deletam próprias instâncias, admins deletam todas"
ON tendenci_whatsapp_connections FOR DELETE
USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);