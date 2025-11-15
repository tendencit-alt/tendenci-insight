-- Adicionar coluna para identificar módulo de origem da tarefa
ALTER TABLE crm_tasks 
ADD COLUMN IF NOT EXISTS origem_modulo TEXT DEFAULT 'crm' CHECK (origem_modulo IN ('crm', 'prospeccao'));