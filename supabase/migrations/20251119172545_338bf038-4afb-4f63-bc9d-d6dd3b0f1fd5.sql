-- Adicionar campo especialização aos perfis de vendedores
ALTER TABLE profiles ADD COLUMN especializacao TEXT CHECK (especializacao IN ('moveis_soltos', 'moveis_planejados', 'todos')) DEFAULT 'todos';

-- Criar índice para performance
CREATE INDEX idx_profiles_especializacao ON profiles(especializacao);

-- Atualizar RLS policy do crm_deals para filtrar por especialização
DROP POLICY IF EXISTS "Autenticados leem deals" ON crm_deals;

CREATE POLICY "Vendedores veem deals da sua especialização"
ON crm_deals
FOR SELECT
TO authenticated
USING (
  -- Admins veem tudo
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  OR
  -- Vendedores com especialização 'todos' veem tudo
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'todos'))
  OR
  -- Vendedores de móveis soltos veem apenas categoria 'Móveis Soltos'
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'moveis_soltos') AND categoria = 'Móveis Soltos')
  OR
  -- Vendedores de móveis planejados veem apenas categoria 'Planejados'
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'moveis_planejados') AND categoria = 'Planejados')
);