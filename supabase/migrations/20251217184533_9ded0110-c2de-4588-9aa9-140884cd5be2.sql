
-- Corrige a função para implementar a regra de 36 horas corretamente
-- Um arquiteto é considerado COM tarefa válida se:
-- 1. Tem tarefa pendente com data futura (data_agendamento >= NOW()), OU
-- 2. Tem qualquer tarefa (qualquer status) com data_agendamento nos últimos 36 horas

DROP FUNCTION IF EXISTS check_campaign_dispatch_allowed(uuid);

CREATE OR REPLACE FUNCTION check_campaign_dispatch_allowed(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  architects_without_tasks jsonb;
  total_count integer;
  user_role text;
  is_admin boolean;
BEGIN
  -- Check if user is admin/master
  SELECT role INTO user_role FROM profiles WHERE id = COALESCE(p_user_id, auth.uid());
  is_admin := user_role IN ('admin', 'master');

  -- Find architects in 'contato_iniciado' or 'parceiro_ativo' stages
  -- that DON'T have a valid task according to the 36-hour rule:
  -- Valid task = 
  --   1. status='pendente' AND data_agendamento >= NOW() (future pending), OR
  --   2. ANY task with data_agendamento >= NOW() - INTERVAL '36 hours' (within 36h window)
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
    AND (is_admin OR a.vendedor_responsavel = COALESCE(p_user_id, auth.uid()))
    AND NOT EXISTS (
      SELECT 1 
      FROM tendenci_prospec_arq_agendamentos t
      WHERE t.architect_id = a.id 
        AND (
          -- Regra 1: Tarefa pendente futura
          (t.status = 'pendente' AND t.data_agendamento >= NOW())
          OR
          -- Regra 2: Qualquer tarefa nos últimos 36h (prazo de graça)
          (t.data_agendamento >= NOW() - INTERVAL '36 hours')
        )
    );

  result := jsonb_build_object(
    'can_dispatch', total_count = 0,
    'total_sem_tarefa', total_count,
    'arquitetos_sem_tarefa', architects_without_tasks
  );

  RETURN result;
END;
$$;
