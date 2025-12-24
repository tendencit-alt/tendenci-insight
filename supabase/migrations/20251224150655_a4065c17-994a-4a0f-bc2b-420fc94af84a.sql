-- 1. Atualizar permissões de Maira e Pollyana para can_delete=true no módulo arquitetos
UPDATE user_permissions 
SET can_delete = true 
WHERE user_id = 'bbf765ae-10fe-4a56-9956-531641d2f633' 
  AND module = 'arquitetos';

UPDATE user_permissions 
SET can_delete = true 
WHERE user_id = '2f572303-3b1e-4ecb-9de4-cca0a25ffb4b' 
  AND module = 'arquitetos';

-- 2. Criar função para verificar permissão de exclusão de arquitetos
CREATE OR REPLACE FUNCTION public.can_delete_architects()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin() OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND module = 'arquitetos'
        AND can_delete = true
    )
$$;

-- 3. Criar função de exclusão segura com limpeza automática
CREATE OR REPLACE FUNCTION public.delete_architect_safely(p_architect_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocking_leads INTEGER;
  blocking_deals INTEGER;
  blocking_projects INTEGER;
  blocking_orders INTEGER;
BEGIN
  -- Verificar permissão
  IF NOT can_delete_architects() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você não tem permissão para excluir arquitetos'
    );
  END IF;

  -- Verificar registros bloqueadores
  SELECT COUNT(*) INTO blocking_leads FROM leads WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO blocking_deals FROM crm_deals WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO blocking_projects FROM projects WHERE architect_id = p_architect_id;
  SELECT COUNT(*) INTO blocking_orders FROM orders WHERE architect_id = p_architect_id;
  
  IF blocking_leads > 0 OR blocking_deals > 0 OR blocking_projects > 0 OR blocking_orders > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Arquiteto possui registros vinculados',
      'details', jsonb_build_object(
        'leads', blocking_leads,
        'deals', blocking_deals,
        'projetos', blocking_projects,
        'pedidos', blocking_orders
      )
    );
  END IF;
  
  -- Limpar tarefas/campanhas pendentes (tabelas que podem não ter CASCADE)
  DELETE FROM tendenci_prospec_arq_agendamentos WHERE architect_id = p_architect_id;
  DELETE FROM tendenci_prospec_arq_campaign_architects WHERE architect_id = p_architect_id;
  DELETE FROM tendenci_campaign_queue WHERE architect_id = p_architect_id;
  
  -- Excluir arquiteto (CASCADE cuida do resto: projects, files, history, timeline, indications)
  DELETE FROM architects WHERE id = p_architect_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Atualizar RLS policy para usar a nova função
DROP POLICY IF EXISTS "Apenas admins podem deletar arquitetos" ON architects;

CREATE POLICY "Usuários com permissão podem deletar arquitetos"
  ON architects FOR DELETE
  USING (can_delete_architects());