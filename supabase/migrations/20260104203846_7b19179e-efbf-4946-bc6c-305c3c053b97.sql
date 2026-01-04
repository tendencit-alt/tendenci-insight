
-- Dropar política atual
DROP POLICY IF EXISTS "Vendedores veem deals próprios e da especialização" ON public.crm_deals;

-- Criar nova política que permite ver deals na etapa Lead para todos
CREATE POLICY "Vendedores veem deals próprios e da especialização"
ON public.crm_deals
FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
  OR
  -- Usuário com especialização "todos" vê tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.especializacao = 'todos'
  )
  OR
  -- Owner sempre vê seus próprios deals
  owner_id = auth.uid()
  OR
  -- NOVO: Todos veem deals na etapa "Lead" (independente da categoria)
  EXISTS (
    SELECT 1 FROM crm_stages s
    WHERE s.id = crm_deals.stage_id
    AND LOWER(s.name) LIKE '%lead%'
  )
  OR
  -- Especialização móveis soltos vê categoria Móveis Soltos
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_soltos'
    )
    AND categoria = 'Móveis Soltos'
  )
  OR
  -- Especialização móveis planejados vê categoria Planejados
  (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.especializacao = 'moveis_planejados'
    )
    AND categoria = 'Planejados'
  )
);
