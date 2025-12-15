-- RPC para verificar se o disparo de campanhas está permitido
-- Bloqueia se houver arquitetos em 'contato_iniciado' ou 'parceiro_ativo' sem tarefas pendentes

CREATE OR REPLACE FUNCTION public.check_campaign_dispatch_allowed()
RETURNS TABLE (
  can_dispatch boolean,
  total_sem_tarefa integer,
  arquitetos_sem_tarefa jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_arquitetos_sem_tarefa jsonb;
  v_total integer;
BEGIN
  -- Buscar arquitetos em contato_iniciado ou parceiro_ativo sem tarefas pendentes
  SELECT 
    COUNT(*)::integer,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id, 
        'name', a.name, 
        'status', a.status_funil,
        'company', a.company
      )
    ), '[]'::jsonb)
  INTO v_total, v_arquitetos_sem_tarefa
  FROM architects a
  WHERE a.status_funil IN ('contato_iniciado', 'parceiro_ativo')
    AND a.active = true
    AND NOT EXISTS (
      SELECT 1 
      FROM tendenci_prospec_arq_agendamentos t
      WHERE t.architect_id = a.id 
        AND t.status = 'pendente'
    );

  RETURN QUERY SELECT 
    v_total = 0 as can_dispatch,
    v_total as total_sem_tarefa,
    v_arquitetos_sem_tarefa as arquitetos_sem_tarefa;
END;
$$;