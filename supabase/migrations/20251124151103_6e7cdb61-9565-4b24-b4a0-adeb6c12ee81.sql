-- FASE 1: Corrigir estrutura do banco de dados

-- 1.1: Tornar created_by opcional
ALTER TABLE tendenci_whatsapp_connections 
  ALTER COLUMN created_by DROP NOT NULL;

-- 1.2: Tornar instance_id opcional
ALTER TABLE tendenci_whatsapp_connections 
  ALTER COLUMN instance_id DROP NOT NULL;

-- 1.3: Adicionar constraint para garantir que instance_name seja único
ALTER TABLE tendenci_whatsapp_connections 
  DROP CONSTRAINT IF EXISTS unique_instance_name;
  
ALTER TABLE tendenci_whatsapp_connections 
  ADD CONSTRAINT unique_instance_name UNIQUE (instance_name);

-- 1.4: DROP das policies antigas
DROP POLICY IF EXISTS "Vendedores podem criar conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Vendedores atualizam suas conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Vendedores deletam suas conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Vendedores veem conexões conectadas" ON tendenci_whatsapp_connections;

-- 1.5: Criar novas policies mais permissivas
CREATE POLICY "Autenticados podem criar conexões"
  ON tendenci_whatsapp_connections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar conexões"
  ON tendenci_whatsapp_connections FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar conexões"
  ON tendenci_whatsapp_connections FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem ver conexões"
  ON tendenci_whatsapp_connections FOR SELECT
  USING (auth.uid() IS NOT NULL);