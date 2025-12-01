-- Adicionar campo processed_at para controlar quando tarefas automatizadas foram processadas
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para otimizar queries de tarefas automatizadas pendentes
CREATE INDEX IF NOT EXISTS idx_crm_tasks_automated_pending 
ON crm_tasks(tipo_tarefa, status, due_at) 
WHERE tipo_tarefa = 'automatizada' AND status = 'open';