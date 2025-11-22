-- Remover políticas de UPDATE conflitantes na tabela crm_tasks
DROP POLICY IF EXISTS "Vendedores atualizam próprias tasks, admins atualizam todas" ON public.crm_tasks;
DROP POLICY IF EXISTS "Vendedores podem editar suas próprias tarefas" ON public.crm_tasks;
DROP POLICY IF EXISTS "Usuarios criam suas proprias tasks" ON public.crm_tasks;

-- Recriar política de INSERT para usuários criarem tarefas
CREATE POLICY "Autenticados criam tarefas"
ON public.crm_tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Criar nova política permissiva para UPDATE
CREATE POLICY "Autenticados podem atualizar tarefas"
ON public.crm_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Comentário explicativo
COMMENT ON POLICY "Autenticados podem atualizar tarefas" ON public.crm_tasks IS 
'Permite que todos os usuários autenticados (vendedores e admins) possam editar qualquer tarefa do CRM. A restrição de DELETE continua apenas para MASTER users.';