-- Remover constraint antigo
ALTER TABLE tendenci_prospec_arq_agendamentos 
DROP CONSTRAINT IF EXISTS check_status;

-- Criar novo constraint com todos os status necessários
ALTER TABLE tendenci_prospec_arq_agendamentos 
ADD CONSTRAINT check_status 
CHECK (status IN ('pendente', 'processing', 'concluida', 'cancelada', 'falha'));

-- Atualizar comentário da coluna
COMMENT ON COLUMN tendenci_prospec_arq_agendamentos.status IS 
'Status: pendente, processing (em execução), concluida, cancelada, falha (após max retries)';