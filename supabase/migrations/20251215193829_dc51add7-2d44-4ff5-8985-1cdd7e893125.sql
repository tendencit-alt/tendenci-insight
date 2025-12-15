
-- Criar função que move arquitetos inativos para etapa "inativo"
CREATE OR REPLACE FUNCTION check_and_move_inactive_architects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inactive_stage_slug TEXT := 'inativo';
  days_threshold INT := 60;
BEGIN
  -- Verificar se o stage "inativo" existe, se não, criar
  INSERT INTO tendenci_prospec_arq_stages (nome, slug, cor, position, ativa, editavel)
  SELECT 'Inativo', 'inativo', 'bg-gray-500', 
         COALESCE((SELECT MAX(position) + 1 FROM tendenci_prospec_arq_stages), 1),
         true, false
  WHERE NOT EXISTS (SELECT 1 FROM tendenci_prospec_arq_stages WHERE slug = 'inativo');

  -- Atualizar arquitetos em parceiro_ativo sem atividade nos últimos 60 dias
  UPDATE architects
  SET 
    status_funil = 'inativo',
    data_marcado_inativo = NOW(),
    updated_at = NOW()
  WHERE 
    status_funil = 'parceiro_ativo'
    AND id NOT IN (
      -- Arquitetos com indicações nos últimos 60 dias
      SELECT DISTINCT architect_id 
      FROM architect_indications 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      -- Arquitetos com projetos nos últimos 60 dias
      SELECT DISTINCT architect_id 
      FROM architect_projects 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      -- Arquitetos com projetos (tabela projects) nos últimos 60 dias
      SELECT DISTINCT architect_id 
      FROM projects 
      WHERE architect_id IS NOT NULL 
      AND created_at >= (CURRENT_DATE - INTERVAL '60 days')
    );
    
  -- Registrar no histórico
  INSERT INTO architect_history (architect_id, event_type, description, created_at)
  SELECT 
    id,
    'status_change',
    'Movido automaticamente para Inativo por falta de indicações ou projetos nos últimos 60 dias',
    NOW()
  FROM architects
  WHERE 
    status_funil = 'inativo'
    AND data_marcado_inativo >= NOW() - INTERVAL '1 minute';
END;
$$;

-- Criar RPC para chamar a função manualmente ou via cron
CREATE OR REPLACE FUNCTION run_inactive_architects_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INT;
BEGIN
  -- Contar antes
  SELECT COUNT(*) INTO affected_count
  FROM architects
  WHERE 
    status_funil = 'parceiro_ativo'
    AND id NOT IN (
      SELECT DISTINCT architect_id FROM architect_indications 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      SELECT DISTINCT architect_id FROM architect_projects 
      WHERE created_at >= (CURRENT_DATE - INTERVAL '60 days')
    )
    AND id NOT IN (
      SELECT DISTINCT architect_id FROM projects 
      WHERE architect_id IS NOT NULL AND created_at >= (CURRENT_DATE - INTERVAL '60 days')
    );

  -- Executar a função
  PERFORM check_and_move_inactive_architects();
  
  RETURN jsonb_build_object(
    'success', true,
    'architects_moved', affected_count,
    'executed_at', NOW()
  );
END;
$$;
