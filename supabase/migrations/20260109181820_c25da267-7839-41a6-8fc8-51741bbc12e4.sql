-- Adicionar campos de pausa da IA na tabela ia_client_memory
ALTER TABLE ia_client_memory 
ADD COLUMN IF NOT EXISTS ia_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ia_paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ia_paused_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ia_paused_reason TEXT;

-- Criar índice para busca eficiente de clientes pausados
CREATE INDEX IF NOT EXISTS idx_ia_client_memory_paused 
ON ia_client_memory(phone_number, instance_name, ia_paused) 
WHERE ia_paused = true;

-- Comentários para documentação
COMMENT ON COLUMN ia_client_memory.ia_paused IS 'Indica se a IA está pausada para este cliente (intervenção humana)';
COMMENT ON COLUMN ia_client_memory.ia_paused_at IS 'Data/hora em que a IA foi pausada';
COMMENT ON COLUMN ia_client_memory.ia_paused_until IS 'Data/hora até quando a IA deve ficar pausada';
COMMENT ON COLUMN ia_client_memory.ia_paused_reason IS 'Motivo da pausa (human_intervention, manual, etc)';