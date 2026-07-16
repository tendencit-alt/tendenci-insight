ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS acrescimo_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acrescimo_justificativa text;