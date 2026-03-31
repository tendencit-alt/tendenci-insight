ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS taxa_link_percentual NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_link_valor NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_link_responsavel TEXT DEFAULT 'tendenci',
  ADD COLUMN IF NOT EXISTS numero_parcelas_link INTEGER DEFAULT 1;