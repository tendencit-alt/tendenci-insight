-- Corrigir a função delete_architect_safely para usar severity válido
CREATE OR REPLACE FUNCTION public.delete_architect_safely(p_architect_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_architect_name text;
  v_linked_leads int;
  v_linked_deals int;
  v_linked_orders int;
  v_linked_projects int;
  v_user_id uuid;
BEGIN
  -- Obter o ID do usuário atual
  v_user_id := auth.uid();

  -- Buscar nome do arquiteto
  SELECT name INTO v_architect_name FROM architects WHERE id = p_architect_id;
  
  IF v_architect_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Arquiteto não encontrado');
  END IF;

  -- Verificar registros vinculados que bloqueiam exclusão
  SELECT COUNT(*) INTO v_linked_leads FROM leads WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO v_linked_deals FROM crm_deals WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO v_linked_orders FROM orders WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO v_linked_projects FROM projects WHERE architect_id = p_architect_id;

  IF v_linked_leads > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Arquiteto possui %s lead(s) vinculado(s). Remova-os primeiro.', v_linked_leads)
    );
  END IF;

  IF v_linked_deals > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Arquiteto possui %s negociação(ões) vinculada(s). Remova-as primeiro.', v_linked_deals)
    );
  END IF;

  IF v_linked_orders > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Arquiteto possui %s pedido(s) vinculado(s). Remova-os primeiro.', v_linked_orders)
    );
  END IF;

  IF v_linked_projects > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Arquiteto possui %s projeto(s) vinculado(s). Remova-os primeiro.', v_linked_projects)
    );
  END IF;

  -- Log de auditoria antes da exclusão (usando severity 'low' que é válido)
  INSERT INTO system_errors (title, description, module, severity, source, metadata, status)
  VALUES (
    'Arquiteto excluído permanentemente',
    format('Arquiteto "%s" (ID: %s) foi excluído do sistema', v_architect_name, p_architect_id),
    'arquitetos',
    'low',
    'delete_architect_safely',
    jsonb_build_object(
      'architect_id', p_architect_id,
      'architect_name', v_architect_name,
      'deleted_by', v_user_id,
      'deleted_at', now()
    ),
    'resolved'
  );

  -- Excluir registros relacionados (em ordem de dependência)
  
  -- Arquitetos em campanhas de prospecção
  DELETE FROM tendenci_prospec_arq_campaign_architects WHERE architect_id = p_architect_id;
  
  -- Tarefas agendadas de prospecção
  DELETE FROM tendenci_prospec_arq_agendamentos WHERE architect_id = p_architect_id;
  
  -- Logs de prospecção
  DELETE FROM tendenci_prospec_arq_logs WHERE architect_id = p_architect_id;
  
  -- Anexos da timeline (precisa deletar antes da timeline)
  DELETE FROM architect_timeline_attachments 
  WHERE timeline_id IN (SELECT id FROM architect_timeline WHERE architect_id = p_architect_id);
  
  -- Timeline
  DELETE FROM architect_timeline WHERE architect_id = p_architect_id;
  
  -- Histórico
  DELETE FROM architect_history WHERE architect_id = p_architect_id;
  
  -- Arquivos
  DELETE FROM architect_files WHERE architect_id = p_architect_id;
  
  -- Projetos de arquiteto (architect_projects, não projects)
  DELETE FROM architect_projects WHERE architect_id = p_architect_id;
  
  -- Indicações (se não houver deals vinculados, já verificamos acima)
  DELETE FROM architect_indications WHERE architect_id = p_architect_id;
  
  -- Metas diárias de arquiteto (se existir)
  DELETE FROM tendenci_daily_architect_goals WHERE architect_id = p_architect_id;

  -- Finalmente, excluir o arquiteto
  DELETE FROM architects WHERE id = p_architect_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Arquiteto "%s" excluído com sucesso', v_architect_name)
  );
END;
$$;