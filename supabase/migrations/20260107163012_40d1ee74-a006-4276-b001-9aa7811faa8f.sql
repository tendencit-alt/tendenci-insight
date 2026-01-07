-- Função SECURITY DEFINER para obter especialização do usuário
CREATE OR REPLACE FUNCTION get_user_especializacao(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT especializacao FROM profiles WHERE id = user_uuid;
$$;

-- Função SECURITY DEFINER para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Remover política antiga
DROP POLICY IF EXISTS "Vendedores veem deals próprios e da especialização" ON crm_deals;

-- Nova política que permite todos verem Leads
CREATE POLICY "Todos veem leads e deals por especialização" ON crm_deals
FOR SELECT USING (
  -- Admins veem tudo
  is_admin_safe()
  OR
  -- Usuários com especialização 'todos' veem tudo
  get_user_especializacao(auth.uid()) = 'todos'
  OR
  -- Owner do deal
  owner_id = auth.uid()
  OR
  -- Todos veem deals na etapa Lead
  EXISTS (
    SELECT 1 FROM crm_stages s 
    WHERE s.id = crm_deals.stage_id 
    AND lower(s.name) LIKE '%lead%'
  )
  OR
  -- Especialização móveis soltos
  (
    get_user_especializacao(auth.uid()) = 'moveis_soltos' 
    AND categoria = 'Móveis Soltos'
  )
  OR
  -- Especialização planejados
  (
    get_user_especializacao(auth.uid()) = 'moveis_planejados' 
    AND categoria = 'Planejados'
  )
);