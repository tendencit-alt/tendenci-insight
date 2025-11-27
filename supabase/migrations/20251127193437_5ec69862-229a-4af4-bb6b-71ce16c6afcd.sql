
-- Remover política antiga de UPDATE
DROP POLICY IF EXISTS "Vendedores atualizam próprios deals ou admins atualizam todos" ON crm_deals;

-- Criar nova política de UPDATE permitindo vendedores atualizarem deals da especialização
CREATE POLICY "Vendedores atualizam deals da especialização ou admins todos"
ON crm_deals FOR UPDATE
TO public
USING (
  -- Admins podem atualizar tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  -- Usuários com especialização 'todos' podem atualizar tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.especializacao = 'todos'
  )
  OR
  -- Vendedor pode atualizar seus próprios deals
  owner_id = auth.uid()
  OR
  -- Vendedores de móveis soltos podem atualizar deals de móveis soltos
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_soltos'
    )
    AND categoria = 'Móveis Soltos'
  )
  OR
  -- Vendedores de móveis planejados podem atualizar deals de planejados
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_planejados'
    )
    AND categoria = 'Planejados'
  )
)
WITH CHECK (
  -- Mesmas condições para WITH CHECK
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.especializacao = 'todos'
  )
  OR
  owner_id = auth.uid()
  OR
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_soltos'
    )
    AND categoria = 'Móveis Soltos'
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_planejados'
    )
    AND categoria = 'Planejados'
  )
);
