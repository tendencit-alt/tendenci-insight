-- Remover política problemática e criar uma mais simples
DROP POLICY IF EXISTS "Autenticados criam tasks" ON crm_tasks;

-- Política de INSERT: permite criar se usuário autenticado E created_by é o próprio usuário
CREATE POLICY "Usuarios criam suas proprias tasks" 
ON crm_tasks 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Garantir que created_by sempre seja preenchido com trigger como fallback
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se created_by não foi fornecido, usar auth.uid()
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para crm_tasks
DROP TRIGGER IF EXISTS ensure_task_created_by ON crm_tasks;
CREATE TRIGGER ensure_task_created_by
  BEFORE INSERT ON crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_created_by();

-- Aplicar o mesmo para tendenci_prospec_arq_agendamentos
DROP TRIGGER IF EXISTS ensure_agendamento_vendedor ON tendenci_prospec_arq_agendamentos;
CREATE TRIGGER ensure_agendamento_vendedor
  BEFORE INSERT ON tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_task_created_by();