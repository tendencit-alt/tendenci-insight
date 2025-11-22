
-- Remover policies antigas conflitantes
DROP POLICY IF EXISTS "Users can update their own tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Vendors can update tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON crm_tasks;

-- Criar policy correta para UPDATE
CREATE POLICY "Vendedores podem editar suas próprias tarefas"
ON crm_tasks
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Garantir que a policy de SELECT está correta
DROP POLICY IF EXISTS "Vendedores veem próprias tasks, admins veem todas" ON crm_tasks;

CREATE POLICY "Vendedores veem próprias tasks, admins veem todas"
ON crm_tasks
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.especializacao = 'todos')
  )
);
