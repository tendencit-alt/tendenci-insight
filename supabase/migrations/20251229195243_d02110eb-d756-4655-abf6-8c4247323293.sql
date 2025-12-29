-- Adicionar coluna source para identificar origem do disparo
ALTER TABLE followup_logs 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'cron';

COMMENT ON COLUMN followup_logs.source IS 'Origem do disparo: cron, manual';