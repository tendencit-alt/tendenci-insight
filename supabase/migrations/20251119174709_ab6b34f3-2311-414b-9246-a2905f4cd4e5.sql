-- Corrigir políticas RLS da tabela crm_tasks para isolamento por vendedor

-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Autenticados leem tasks" ON crm_tasks;

-- Remover política antiga de UPDATE
DROP POLICY IF EXISTS "Autenticados atualizam tasks" ON crm_tasks;

-- Remover política antiga de DELETE
DROP POLICY IF EXISTS "Autenticados deletam tasks" ON crm_tasks;

-- Nova política SELECT: vendedores veem apenas suas tarefas, admins e "todos" veem tudo
CREATE POLICY "Vendedores veem próprias tasks, admins veem todas"
ON crm_tasks
FOR SELECT
TO authenticated
USING (
  -- Admins veem tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  -- Usuários com especialização "todos" veem tudo
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND especializacao = 'todos'
  )
  OR
  -- Vendedores veem apenas tarefas que criaram
  created_by = auth.uid()
);

-- Nova política UPDATE: vendedores atualizam apenas suas tarefas, admins atualizam tudo
CREATE POLICY "Vendedores atualizam próprias tasks, admins atualizam todas"
ON crm_tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND especializacao = 'todos'
  )
  OR
  created_by = auth.uid()
);

-- Nova política DELETE: vendedores deletam apenas suas tarefas, admins deletam tudo
CREATE POLICY "Vendedores deletam próprias tasks, admins deletam todas"
ON crm_tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND especializacao = 'todos'
  )
  OR
  created_by = auth.uid()
);