-- Corrigir política de INSERT em crm_tasks para garantir que created_by seja o usuário autenticado
DROP POLICY IF EXISTS "Autenticados criam tasks" ON crm_tasks;

CREATE POLICY "Autenticados criam tasks" 
ON crm_tasks 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (created_by = auth.uid() OR created_by IS NULL)
);