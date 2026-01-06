-- 1. Mover todos os deals do pipeline "CRM de Vendas" para "Funil de Vendas Padrão" na etapa "Follow Up (I.A)"
UPDATE crm_deals 
SET 
  pipeline_id = '84c3f76c-8a03-4bfa-b3e1-a3eca2adbafc',
  stage_id = '27f5f6fa-bb2d-4b75-a6ad-7e6f9f23fb3e',
  stage_entered_at = now(),
  updated_at = now()
WHERE pipeline_id = '0e01da37-e5ba-4e09-a3b9-6e7bca4cf5b3';

-- 2. Registrar a movimentação no histórico para cada deal migrado
INSERT INTO crm_deal_history (deal_id, from_stage_id, to_stage_id, moved_at, action_type, description)
SELECT 
  id,
  stage_id,
  '27f5f6fa-bb2d-4b75-a6ad-7e6f9f23fb3e',
  now(),
  'stage_change',
  'Migrado do pipeline CRM de Vendas para Funil de Vendas Padrão - Unificação de pipelines'
FROM crm_deals 
WHERE pipeline_id = '84c3f76c-8a03-4bfa-b3e1-a3eca2adbafc'
AND stage_id = '27f5f6fa-bb2d-4b75-a6ad-7e6f9f23fb3e'
AND updated_at >= now() - interval '1 minute';

-- 3. Deletar as etapas do pipeline antigo
DELETE FROM crm_stages WHERE pipeline_id = '0e01da37-e5ba-4e09-a3b9-6e7bca4cf5b3';

-- 4. Deletar o pipeline antigo
DELETE FROM crm_pipelines WHERE id = '0e01da37-e5ba-4e09-a3b9-6e7bca4cf5b3';