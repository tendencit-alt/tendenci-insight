-- Criar deals para leads órfãos (leads que existem mas não têm deal associado)
INSERT INTO crm_deals (
  pipeline_id,
  stage_id,
  lead_id,
  title,
  status,
  from_ai,
  ai_status,
  conversation_history,
  created_at
)
SELECT 
  (SELECT id FROM crm_pipelines ORDER BY created_at LIMIT 1) as pipeline_id,
  (SELECT id FROM crm_stages WHERE pipeline_id = (SELECT id FROM crm_pipelines ORDER BY created_at LIMIT 1) ORDER BY position LIMIT 1) as stage_id,
  l.id as lead_id,
  'Lead - ' || c.name as title,
  'aberto' as status,
  true as from_ai,
  COALESCE(l.temperature, 'morno') as ai_status,
  '📋 Deal criado automaticamente para lead órfão' as conversation_history,
  l.created_at
FROM leads l
JOIN clients c ON l.client_id = c.id
LEFT JOIN crm_deals d ON d.lead_id = l.id
WHERE d.id IS NULL;