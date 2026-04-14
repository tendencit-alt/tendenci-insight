
-- Projetos
CREATE TABLE public.prj_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  project_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT DEFAULT 'standard',
  client_id UUID REFERENCES public.clients(id),
  responsible_id UUID,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  sold_value NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  outsourcing_cost NUMERIC DEFAULT 0,
  logistics_cost NUMERIC DEFAULT 0,
  rework_cost NUMERIC DEFAULT 0,
  admin_cost NUMERIC DEFAULT 0,
  estimated_margin NUMERIC GENERATED ALWAYS AS (CASE WHEN sold_value > 0 THEN ((sold_value - estimated_cost) / sold_value) * 100 ELSE 0 END) STORED,
  actual_margin NUMERIC GENERATED ALWAYS AS (CASE WHEN sold_value > 0 THEN ((sold_value - actual_cost) / sold_value) * 100 ELSE 0 END) STORED,
  cost_deviation NUMERIC GENERATED ALWAYS AS (actual_cost - estimated_cost) STORED,
  completion_percent NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.prj_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_prj_projects" ON public.prj_projects FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_prj_projects" ON public.prj_projects FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_prj_projects" ON public.prj_projects FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_prj_projects" ON public.prj_projects FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE INDEX idx_prj_projects_tenant ON public.prj_projects(tenant_id);
CREATE INDEX idx_prj_projects_status ON public.prj_projects(status);
CREATE INDEX idx_prj_projects_client ON public.prj_projects(client_id);

-- Etapas / Marcos
CREATE TABLE public.prj_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.prj_projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  phase_type TEXT DEFAULT 'phase',
  position INTEGER DEFAULT 0,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  completion_percent NUMERIC DEFAULT 0,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.prj_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_prj_phases" ON public.prj_phases FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_prj_phases" ON public.prj_phases FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_prj_phases" ON public.prj_phases FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_prj_phases" ON public.prj_phases FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Recursos planejados
CREATE TABLE public.prj_planned_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.prj_projects(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'labor',
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'h',
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.prj_planned_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_prj_planned_resources" ON public.prj_planned_resources FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_prj_planned_resources" ON public.prj_planned_resources FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_prj_planned_resources" ON public.prj_planned_resources FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_prj_planned_resources" ON public.prj_planned_resources FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Execução / Logs
CREATE TABLE public.prj_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.prj_projects(id) ON DELETE CASCADE NOT NULL,
  ops_order_id UUID REFERENCES public.ops_orders(id),
  employee_id UUID REFERENCES public.hr_employees(id),
  log_type TEXT DEFAULT 'hours',
  description TEXT,
  hours NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  work_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.prj_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_prj_execution_logs" ON public.prj_execution_logs FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_prj_execution_logs" ON public.prj_execution_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_prj_execution_logs" ON public.prj_execution_logs FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_prj_execution_logs" ON public.prj_execution_logs FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Alterações de escopo
CREATE TABLE public.prj_scope_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.prj_projects(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  cost_impact NUMERIC DEFAULT 0,
  schedule_impact_days INTEGER DEFAULT 0,
  requested_by TEXT,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.prj_scope_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_prj_scope_changes" ON public.prj_scope_changes FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_prj_scope_changes" ON public.prj_scope_changes FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_prj_scope_changes" ON public.prj_scope_changes FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_prj_scope_changes" ON public.prj_scope_changes FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Triggers set_tenant_id
CREATE TRIGGER set_tenant_id_prj_projects BEFORE INSERT ON public.prj_projects FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_prj_phases BEFORE INSERT ON public.prj_phases FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_prj_planned_resources BEFORE INSERT ON public.prj_planned_resources FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_prj_execution_logs BEFORE INSERT ON public.prj_execution_logs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_prj_scope_changes BEFORE INSERT ON public.prj_scope_changes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER PUBLICATION supabase_realtime ADD TABLE public.prj_projects;
