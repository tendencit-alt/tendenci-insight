
-- Reservas de estoque
CREATE TABLE public.inv_stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  project_id UUID REFERENCES public.prj_projects(id),
  ops_order_id UUID REFERENCES public.ops_orders(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  consumed_quantity NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'reservado',
  needed_by DATE,
  reserved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inv_stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_inv_stock_reservations" ON public.inv_stock_reservations FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_inv_stock_reservations" ON public.inv_stock_reservations FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_inv_stock_reservations" ON public.inv_stock_reservations FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_inv_stock_reservations" ON public.inv_stock_reservations FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE INDEX idx_inv_reservations_product ON public.inv_stock_reservations(product_id);
CREATE INDEX idx_inv_reservations_tenant ON public.inv_stock_reservations(tenant_id);

-- Melhorias na tabela products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'materia_prima';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_cost NUMERIC DEFAULT 0;

-- Trigger tenant
CREATE TRIGGER set_tenant_id_inv_stock_reservations BEFORE INSERT ON public.inv_stock_reservations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_stock_reservations;
