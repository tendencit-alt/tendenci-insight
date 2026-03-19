
-- Add order_id column to fin_payables (referenced by trigger but missing)
ALTER TABLE public.fin_payables ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Now fix FK constraints on orders: nullify old profile-based IDs
UPDATE public.orders SET 
  comissao_vendedor_responsavel_id = NULL,
  comissao_montador_responsavel_id = NULL,
  comissao_orcamentista_responsavel_id = NULL,
  comissao_projetista_responsavel_id = NULL,
  comissao_producao_responsavel_id = NULL
WHERE comissao_vendedor_responsavel_id IS NOT NULL 
   OR comissao_montador_responsavel_id IS NOT NULL
   OR comissao_orcamentista_responsavel_id IS NOT NULL
   OR comissao_projetista_responsavel_id IS NOT NULL
   OR comissao_producao_responsavel_id IS NOT NULL;

-- Drop old FK constraints referencing profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_comissao_montador_responsavel_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_comissao_orcamentista_responsavel_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_comissao_projetista_responsavel_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_comissao_vendedor_responsavel_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_comissao_producao_responsavel_id_fkey;

-- Re-create FK constraints referencing order_responsibles
ALTER TABLE public.orders
  ADD CONSTRAINT orders_comissao_montador_responsavel_id_fkey
    FOREIGN KEY (comissao_montador_responsavel_id) REFERENCES public.order_responsibles(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_comissao_orcamentista_responsavel_id_fkey
    FOREIGN KEY (comissao_orcamentista_responsavel_id) REFERENCES public.order_responsibles(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_comissao_projetista_responsavel_id_fkey
    FOREIGN KEY (comissao_projetista_responsavel_id) REFERENCES public.order_responsibles(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_comissao_vendedor_responsavel_id_fkey
    FOREIGN KEY (comissao_vendedor_responsavel_id) REFERENCES public.order_responsibles(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_comissao_producao_responsavel_id_fkey
    FOREIGN KEY (comissao_producao_responsavel_id) REFERENCES public.order_responsibles(id) ON DELETE SET NULL;
