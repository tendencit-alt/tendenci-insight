
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS comissao_montador_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_montador_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_montador_responsavel_id uuid REFERENCES public.profiles(id);
