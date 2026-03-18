ALTER TYPE public.order_responsible_type ADD VALUE IF NOT EXISTS 'producao';

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS comissao_producao_percentual numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS comissao_producao_valor numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS comissao_producao_responsavel_id uuid NULL,
ADD COLUMN IF NOT EXISTS comissao_producao_responsible_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_comissao_producao_responsavel_id_fkey'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_comissao_producao_responsavel_id_fkey
    FOREIGN KEY (comissao_producao_responsavel_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_comissao_producao_responsible_id_fkey'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_comissao_producao_responsible_id_fkey
    FOREIGN KEY (comissao_producao_responsible_id)
    REFERENCES public.order_responsibles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_comissao_producao_responsible_id
ON public.orders (comissao_producao_responsible_id);

CREATE INDEX IF NOT EXISTS idx_orders_comissao_producao_responsavel_id
ON public.orders (comissao_producao_responsavel_id);