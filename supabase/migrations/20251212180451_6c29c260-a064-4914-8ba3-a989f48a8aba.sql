-- Limpar notificações antigas de automação da Maira
UPDATE notifications
SET read = true
WHERE user_id = 'bbf765ae-10fe-4a56-9956-531641d2f633'
AND type = 'automation_failure'
AND read = false;

-- Adicionar coluna retry_count em crm_tasks para controle de retentativas
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Adicionar coluna retry_count em tendenci_prospec_arq_agendamentos (tarefas de prospecção)
ALTER TABLE tendenci_prospec_arq_agendamentos ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;