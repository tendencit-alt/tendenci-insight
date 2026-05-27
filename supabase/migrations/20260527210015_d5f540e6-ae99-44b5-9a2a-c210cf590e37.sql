ALTER TABLE public.order_responsibles
  ADD COLUMN IF NOT EXISTS chart_account_id uuid REFERENCES public.fin_chart_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_responsibles_chart_account
  ON public.order_responsibles(chart_account_id);

ALTER TABLE public.order_responsibles
  ALTER COLUMN type DROP NOT NULL;