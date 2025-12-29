-- Criar índice único para evitar duplicações em followup_logs
-- Isso permite usar upsert com onConflict corretamente
CREATE UNIQUE INDEX IF NOT EXISTS followup_logs_deal_followup_unique 
ON followup_logs(deal_id, followup_number);

-- Adicionar coluna source se não existir (para rastreio de disparo manual vs cron)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'followup_logs' AND column_name = 'source'
  ) THEN
    ALTER TABLE followup_logs ADD COLUMN source text DEFAULT 'cron';
    COMMENT ON COLUMN followup_logs.source IS 'Origem do disparo: cron (automático) ou manual';
  END IF;
END $$;