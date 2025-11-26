-- Fase 1: Corrigir política RLS de SELECT em crm_deals
-- Adicionar condição para vendedores sempre verem seus próprios deals

DROP POLICY IF EXISTS "Vendedores veem deals da sua especialização" ON crm_deals;

CREATE POLICY "Vendedores veem deals próprios e da especialização" ON crm_deals
FOR SELECT USING (
  -- Admins veem tudo
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  -- Especialização 'todos' vê tudo
  OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'todos'))
  -- NOVO: Vendedores SEMPRE veem seus próprios deals
  OR owner_id = auth.uid()
  -- Vendedor móveis soltos vê deals móveis soltos
  OR ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'moveis_soltos')) AND categoria = 'Móveis Soltos')
  -- Vendedor planejados vê deals planejados
  OR ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND especializacao = 'moveis_planejados')) AND categoria = 'Planejados')
);

-- Fase 2: Atualizar política de UPDATE para ser mais explícita

DROP POLICY IF EXISTS "Autenticados atualizam deals" ON crm_deals;

CREATE POLICY "Vendedores atualizam próprios deals ou admins atualizam todos" ON crm_deals
FOR UPDATE USING (
  -- Vendedor pode atualizar seu próprio deal
  owner_id = auth.uid()
  -- Ou é admin
  OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
);