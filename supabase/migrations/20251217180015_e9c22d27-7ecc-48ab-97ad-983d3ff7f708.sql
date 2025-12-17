
-- Adicionar colunas para histórico detalhado
ALTER TABLE architect_history 
ADD COLUMN IF NOT EXISTS old_value TEXT,
ADD COLUMN IF NOT EXISTS new_value TEXT,
ADD COLUMN IF NOT EXISTS field_name TEXT;
