-- Remover função RPC duplicada (versão antiga com 6 parâmetros)
DROP FUNCTION IF EXISTS get_prospeccao_architects_optimized(BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT);

-- Adicionar coluna faltante em production_automation_logs
ALTER TABLE production_automation_logs 
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ DEFAULT NOW();