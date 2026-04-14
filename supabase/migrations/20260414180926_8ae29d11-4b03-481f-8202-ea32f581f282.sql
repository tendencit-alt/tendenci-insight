
-- Solicitações de compra
CREATE TABLE public.sup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  request_number SERIAL,
  requester_id UUID,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.prj_projects(id),
  ops_order_id UUID REFERENCES public.ops_orders(id),
  origin TEXT DEFAULT 'manual',
  priority TEXT DEFAULT 'normal',
  needed_by DATE,
  estimated_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  description TEXT,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_sup_requests" ON public.sup_requests FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_sup_requests" ON public.sup_requests FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_sup_requests" ON public.sup_requests FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_sup_requests" ON public.sup_requests FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE INDEX idx_sup_requests_tenant ON public.sup_requests(tenant_id);

-- Cotações de compra
CREATE TABLE public.sup_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  quotation_number SERIAL,
  request_id UUID REFERENCES public.sup_requests(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  delivery_days INTEGER DEFAULT 0,
  payment_terms TEXT,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  selected BOOLEAN DEFAULT false,
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sup_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_sup_quotations" ON public.sup_quotations FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_sup_quotations" ON public.sup_quotations FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_sup_quotations" ON public.sup_quotations FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_sup_quotations" ON public.sup_quotations FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Itens de cotação
CREATE TABLE public.sup_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  quotation_id UUID REFERENCES public.sup_quotations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sup_quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_sup_quotation_items" ON public.sup_quotation_items FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_sup_quotation_items" ON public.sup_quotation_items FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_sup_quotation_items" ON public.sup_quotation_items FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_sup_quotation_items" ON public.sup_quotation_items FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Avaliações de fornecedor
CREATE TABLE public.sup_supplier_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  quality_score INTEGER DEFAULT 5,
  delivery_score INTEGER DEFAULT 5,
  price_score INTEGER DEFAULT 5,
  communication_score INTEGER DEFAULT 5,
  overall_score NUMERIC GENERATED ALWAYS AS ((quality_score + delivery_score + price_score + communication_score) / 4.0) STORED,
  notes TEXT,
  evaluated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sup_supplier_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_sup_supplier_evaluations" ON public.sup_supplier_evaluations FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_sup_supplier_evaluations" ON public.sup_supplier_evaluations FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_sup_supplier_evaluations" ON public.sup_supplier_evaluations FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_sup_supplier_evaluations" ON public.sup_supplier_evaluations FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Adicionar vínculos ao purchase_orders existente
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.prj_projects(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.fin_cost_centers(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS ops_order_id UUID REFERENCES public.ops_orders(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.sup_requests(id);

-- Triggers tenant_id
CREATE TRIGGER set_tenant_id_sup_requests BEFORE INSERT ON public.sup_requests FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sup_quotations BEFORE INSERT ON public.sup_quotations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sup_quotation_items BEFORE INSERT ON public.sup_quotation_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sup_supplier_evaluations BEFORE INSERT ON public.sup_supplier_evaluations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sup_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sup_quotations;
