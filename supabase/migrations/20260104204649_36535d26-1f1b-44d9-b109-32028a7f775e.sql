-- Adicionar colunas para melhor gerenciamento de tarefas
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Criar índice para consultas de tarefas arquivadas
CREATE INDEX IF NOT EXISTS idx_crm_tasks_archived ON crm_tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Criar índice para consultas de tarefas com status failed
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);