
CREATE TABLE public.order_strategic_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  chart_account_id UUID NOT NULL REFERENCES public.fin_chart_accounts(id),
  percentual NUMERIC NOT NULL DEFAULT 0,
  valor NUMERIC NOT NULL DEFAULT 0,
  responsavel_id UUID REFERENCES public.order_responsibles(id),
  habilitado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE(order_id, chart_account_id)
);

ALTER TABLE public.order_strategic_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order commitments"
ON public.order_strategic_commitments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert order commitments"
ON public.order_strategic_commitments FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update order commitments"
ON public.order_strategic_commitments FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete order commitments"
ON public.order_strategic_commitments FOR DELETE TO authenticated
USING (true);

CREATE TRIGGER update_order_strategic_commitments_updated_at
BEFORE UPDATE ON public.order_strategic_commitments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
