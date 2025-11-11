-- Remover trigger duplicado de mudança de estágio primeiro
DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON crm_deals;
DROP TRIGGER IF EXISTS log_deal_stage_change_trigger ON crm_deals;

-- Agora remover a função
DROP FUNCTION IF EXISTS log_deal_stage_change();

-- Limpar registros duplicados históricos (manter apenas o que tem description)
DELETE FROM crm_deal_history a
USING crm_deal_history b
WHERE a.id > b.id
  AND a.deal_id = b.deal_id
  AND a.moved_at = b.moved_at
  AND a.action_type = b.action_type
  AND a.action_type = 'stage_change'
  AND a.description IS NULL
  AND b.description IS NOT NULL;