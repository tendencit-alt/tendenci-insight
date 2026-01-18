-- Adicionar campos de recorrência aos lançamentos
ALTER TABLE public.fin_ledger_entries
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER, -- número de repetições
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE, -- ou data final
ADD COLUMN IF NOT EXISTS parent_entry_id UUID REFERENCES public.fin_ledger_entries(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.fin_ledger_entries.is_recurring IS 'Indica se é um lançamento recorrente';
COMMENT ON COLUMN public.fin_ledger_entries.recurrence_type IS 'Tipo de recorrência: daily, weekly, monthly, yearly';
COMMENT ON COLUMN public.fin_ledger_entries.recurrence_count IS 'Número de repetições do lançamento';
COMMENT ON COLUMN public.fin_ledger_entries.recurrence_end_date IS 'Data final da recorrência';
COMMENT ON COLUMN public.fin_ledger_entries.parent_entry_id IS 'ID do lançamento pai (para lançamentos gerados por recorrência)';