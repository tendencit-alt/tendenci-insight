-- Adicionar coluna archived_at para permitir arquivar tarefas com falha
ALTER TABLE tendenci_prospec_arq_agendamentos 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para melhorar performance de queries que filtram por archived_at
CREATE INDEX IF NOT EXISTS idx_prospec_agendamentos_archived 
ON tendenci_prospec_arq_agendamentos(archived_at) 
WHERE archived_at IS NULL;