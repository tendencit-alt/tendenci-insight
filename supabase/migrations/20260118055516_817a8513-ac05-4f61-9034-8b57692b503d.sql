-- Add late interest/fees field to ledger entries
ALTER TABLE public.fin_ledger_entries 
ADD COLUMN IF NOT EXISTS juros_atraso NUMERIC DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.fin_ledger_entries.juros_atraso IS 'Valor de juros por atraso aplicado ao lançamento';