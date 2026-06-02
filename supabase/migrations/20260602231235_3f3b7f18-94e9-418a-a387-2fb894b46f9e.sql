
CREATE TABLE public.order_deadline_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_deadline DATE,
  new_deadline DATE,
  reason TEXT NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_deadline_history_order ON public.order_deadline_history(order_id, created_at DESC);
CREATE INDEX idx_order_deadline_history_tenant ON public.order_deadline_history(tenant_id);

GRANT SELECT, INSERT ON public.order_deadline_history TO authenticated;
GRANT ALL ON public.order_deadline_history TO service_role;

ALTER TABLE public.order_deadline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read deadline history"
ON public.order_deadline_history FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_owner = true)
);

CREATE POLICY "tenant members insert deadline history"
ON public.order_deadline_history FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_owner = true)
);
