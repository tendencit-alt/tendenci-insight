-- PASSO 1: Remover policies antigas de admin-only
DROP POLICY IF EXISTS "Admins podem ver todas as conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Admins podem criar conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Admins podem atualizar conexões" ON tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Admins podem deletar conexões" ON tendenci_whatsapp_connections;

-- PASSO 2: Criar políticas RLS para vendedores e admins
-- Vendedores podem VER todas as conexões conectadas (para usar em campanhas)
CREATE POLICY "Vendedores veem conexões conectadas"
ON tendenci_whatsapp_connections FOR SELECT
USING (
  status = 'connected' OR 
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Vendedores podem CRIAR suas próprias conexões
CREATE POLICY "Vendedores podem criar conexões"
ON tendenci_whatsapp_connections FOR INSERT
WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Vendedores podem ATUALIZAR suas próprias conexões, admins atualizam todas
CREATE POLICY "Vendedores atualizam suas conexões"
ON tendenci_whatsapp_connections FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Vendedores podem DELETAR suas próprias conexões, admins deletam todas
CREATE POLICY "Vendedores deletam suas conexões"
ON tendenci_whatsapp_connections FOR DELETE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- PASSO 3: Garantir que vendedor_id é obrigatório em campanhas
ALTER TABLE tendenci_prospec_arq_campaigns
ALTER COLUMN vendedor_id SET DEFAULT auth.uid();

-- PASSO 4: Adicionar colunas para metadados de webhook em conexões
ALTER TABLE tendenci_whatsapp_connections
ADD COLUMN IF NOT EXISTS webhook_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- PASSO 5: Habilitar realtime para atualizações instantâneas
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_whatsapp_connections;