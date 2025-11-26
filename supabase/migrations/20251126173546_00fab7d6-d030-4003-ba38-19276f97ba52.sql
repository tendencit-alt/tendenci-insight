-- Corrigir tarefas órfãs atribuindo ao owner do deal
UPDATE crm_tasks t
SET created_by = d.owner_id
FROM crm_deals d
WHERE t.deal_id = d.id
AND t.created_by IS NULL
AND d.owner_id IS NOT NULL;