-- Master Products module: extend products and add FK to order_items
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ativo_no_catalogo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_curta text,
  ADD COLUMN IF NOT EXISTS descricao_longa text,
  ADD COLUMN IF NOT EXISTS imagens text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dimensoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS peso numeric,
  ADD COLUMN IF NOT EXISTS prazo_producao_dias integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_ativo_catalogo
  ON public.products (ativo_no_catalogo) WHERE ativo_no_catalogo = true;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_produto_id ON public.order_items (produto_id);