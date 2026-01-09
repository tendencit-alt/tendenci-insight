-- 1. Remover política existente de UPDATE
DROP POLICY IF EXISTS "Vendedores atualizam deals da especialização ou admins todos" ON crm_deals;

-- 2. Criar nova política mais permissiva para vendedores
CREATE POLICY "Vendedores autenticados podem atualizar deals"
ON crm_deals
FOR UPDATE
USING (
  -- Admin pode tudo
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  OR
  -- Qualquer vendedor autenticado pode editar
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'vendedor'))
)
WITH CHECK (
  -- Mesma regra para o WITH CHECK
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  OR
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'vendedor'))
);