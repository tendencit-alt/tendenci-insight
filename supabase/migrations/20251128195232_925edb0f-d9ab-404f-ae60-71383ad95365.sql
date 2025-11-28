-- Fase 1: Ajustar RLS para permitir vendedores verem e editarem todas as tarefas

-- Remover policy antiga que restringia SELECT
DROP POLICY IF EXISTS "Vendedores veem próprias tasks, admins veem todas" ON crm_tasks;

-- Nova policy: vendedores veem todas as tarefas dos deals que têm acesso
CREATE POLICY "Vendedores veem tasks dos deals que têm acesso" ON crm_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy de UPDATE já existe e permite edição por qualquer autenticado
-- Policy de DELETE continua restrita a MASTER/admin/especializacao='todos'