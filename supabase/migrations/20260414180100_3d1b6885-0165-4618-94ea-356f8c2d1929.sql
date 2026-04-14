
-- Ordens operacionais
CREATE TABLE public.ops_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  order_number SERIAL,
  order_type TEXT NOT NULL DEFAULT 'production',
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id),
  source_order_id UUID REFERENCES public.orders(id),
  project_id UUID,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  responsible_id UUID,
  team_id UUID REFERENCES public.hr_teams(id),
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_orders" ON public.ops_orders FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_orders" ON public.ops_orders FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_orders" ON public.ops_orders FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_orders" ON public.ops_orders FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE INDEX idx_ops_orders_tenant ON public.ops_orders(tenant_id);
CREATE INDEX idx_ops_orders_status ON public.ops_orders(status);
CREATE INDEX idx_ops_orders_type ON public.ops_orders(order_type);

-- Atividades de execução
CREATE TABLE public.ops_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ops_order_id UUID REFERENCES public.ops_orders(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.hr_employees(id),
  team_id UUID REFERENCES public.hr_teams(id),
  activity_type TEXT NOT NULL DEFAULT 'execution',
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours_spent NUMERIC DEFAULT 0,
  hourly_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (hours_spent * hourly_cost) STORED,
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_activities" ON public.ops_activities FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_activities" ON public.ops_activities FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_activities" ON public.ops_activities FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_activities" ON public.ops_activities FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Materiais consumidos
CREATE TABLE public.ops_material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ops_order_id UUID REFERENCES public.ops_orders(id) ON DELETE CASCADE NOT NULL,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'un',
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_material_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_material_usage" ON public.ops_material_usage FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_material_usage" ON public.ops_material_usage FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_material_usage" ON public.ops_material_usage FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_material_usage" ON public.ops_material_usage FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Ocorrências
CREATE TABLE public.ops_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ops_order_id UUID REFERENCES public.ops_orders(id) ON DELETE CASCADE NOT NULL,
  occurrence_type TEXT NOT NULL DEFAULT 'issue',
  severity TEXT DEFAULT 'low',
  description TEXT NOT NULL,
  reported_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_occurrences" ON public.ops_occurrences FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_occurrences" ON public.ops_occurrences FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_occurrences" ON public.ops_occurrences FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_occurrences" ON public.ops_occurrences FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Sequenciamento / Agendamento
CREATE TABLE public.ops_scheduling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ops_order_id UUID REFERENCES public.ops_orders(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  scheduled_start DATE,
  scheduled_end DATE,
  machine_or_resource TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_scheduling ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_scheduling" ON public.ops_scheduling FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_scheduling" ON public.ops_scheduling FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_scheduling" ON public.ops_scheduling FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_scheduling" ON public.ops_scheduling FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Capacidade equipes/máquinas
CREATE TABLE public.ops_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  resource_type TEXT NOT NULL DEFAULT 'team',
  resource_name TEXT NOT NULL,
  team_id UUID REFERENCES public.hr_teams(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  available_hours NUMERIC NOT NULL DEFAULT 0,
  allocated_hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ops_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_ops_capacity" ON public.ops_capacity FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_ops_capacity" ON public.ops_capacity FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_ops_capacity" ON public.ops_capacity FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_ops_capacity" ON public.ops_capacity FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Triggers set_tenant_id
CREATE TRIGGER set_tenant_id_ops_orders BEFORE INSERT ON public.ops_orders FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_ops_activities BEFORE INSERT ON public.ops_activities FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_ops_material_usage BEFORE INSERT ON public.ops_material_usage FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_ops_occurrences BEFORE INSERT ON public.ops_occurrences FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_ops_scheduling BEFORE INSERT ON public.ops_scheduling FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_ops_capacity BEFORE INSERT ON public.ops_capacity FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_activities;
