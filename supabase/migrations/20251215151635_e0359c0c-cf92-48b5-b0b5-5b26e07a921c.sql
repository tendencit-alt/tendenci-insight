
-- Drop and recreate the function with corrected logic for overdue tasks
DROP FUNCTION IF EXISTS check_campaign_dispatch_allowed();

CREATE OR REPLACE FUNCTION check_campaign_dispatch_allowed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  architects_without_tasks jsonb;
  total_count integer;
BEGIN
  -- Find architects in 'contato_iniciado' or 'parceiro_ativo' stages
  -- that DON'T have a VALID pending task (valid = status='pendente' AND data_agendamento >= NOW())
  -- Overdue tasks (data_agendamento < NOW()) are considered as "no task"
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'company', a.company,
        'phone', a.phone,
        'status', a.status_funil
      )
    ), '[]'::jsonb),
    COUNT(*)::integer
  INTO architects_without_tasks, total_count
  FROM architects a
  WHERE a.active = true
    AND a.status_funil IN ('contato_iniciado', 'parceiro_ativo')
    AND NOT EXISTS (
      SELECT 1 
      FROM tendenci_prospec_arq_agendamentos t
      WHERE t.architect_id = a.id 
        AND t.status = 'pendente'
        AND t.data_agendamento >= NOW() -- Only future/current tasks count as valid
    );

  result := jsonb_build_object(
    'can_dispatch', total_count = 0,
    'total_sem_tarefa', total_count,
    'arquitetos_sem_tarefa', architects_without_tasks
  );

  RETURN result;
END;
$$;
