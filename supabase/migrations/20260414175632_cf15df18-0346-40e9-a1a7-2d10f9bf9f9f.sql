
-- Departamentos
CREATE TABLE public.hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  manager_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_departments" ON public.hr_departments FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_departments" ON public.hr_departments FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_departments" ON public.hr_departments FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_departments" ON public.hr_departments FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Equipes
CREATE TABLE public.hr_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  department_id UUID REFERENCES public.hr_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_teams" ON public.hr_teams FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_teams" ON public.hr_teams FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_teams" ON public.hr_teams FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_teams" ON public.hr_teams FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Cargos
CREATE TABLE public.hr_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  min_salary NUMERIC DEFAULT 0,
  max_salary NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_positions" ON public.hr_positions FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_positions" ON public.hr_positions FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_positions" ON public.hr_positions FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_positions" ON public.hr_positions FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

-- Colaboradores
CREATE TABLE public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  cpf TEXT,
  registration_number TEXT,
  position_id UUID REFERENCES public.hr_positions(id),
  department_id UUID REFERENCES public.hr_departments(id),
  team_id UUID REFERENCES public.hr_teams(id),
  manager_id UUID REFERENCES public.hr_employees(id),
  base_salary NUMERIC NOT NULL DEFAULT 0,
  benefits_percent NUMERIC NOT NULL DEFAULT 70,
  monthly_hours NUMERIC NOT NULL DEFAULT 220,
  monthly_cost NUMERIC GENERATED ALWAYS AS (base_salary * (1 + benefits_percent / 100)) STORED,
  hourly_cost NUMERIC GENERATED ALWAYS AS (CASE WHEN monthly_hours > 0 THEN (base_salary * (1 + benefits_percent / 100)) / monthly_hours ELSE 0 END) STORED,
  status TEXT NOT NULL DEFAULT 'active',
  admission_date DATE,
  termination_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_employees" ON public.hr_employees FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_employees" ON public.hr_employees FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_employees" ON public.hr_employees FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_employees" ON public.hr_employees FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE INDEX idx_hr_employees_tenant ON public.hr_employees(tenant_id);
CREATE INDEX idx_hr_employees_department ON public.hr_employees(department_id);
CREATE INDEX idx_hr_employees_status ON public.hr_employees(status);

-- Jornadas / Ponto
CREATE TABLE public.hr_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE NOT NULL,
  work_date DATE NOT NULL,
  planned_hours NUMERIC DEFAULT 8,
  worked_hours NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  absence_hours NUMERIC DEFAULT 0,
  late_minutes NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, work_date)
);
ALTER TABLE public.hr_timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_timesheets" ON public.hr_timesheets FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_timesheets" ON public.hr_timesheets FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_timesheets" ON public.hr_timesheets FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_timesheets" ON public.hr_timesheets FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE INDEX idx_hr_timesheets_employee_date ON public.hr_timesheets(employee_id, work_date);

-- Rateio de custos de mão de obra
CREATE TABLE public.hr_labor_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE NOT NULL,
  reference_month DATE NOT NULL,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID,
  production_order_id UUID,
  allocated_hours NUMERIC NOT NULL DEFAULT 0,
  allocated_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_labor_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_hr_labor_allocations" ON public.hr_labor_allocations FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_insert_hr_labor_allocations" ON public.hr_labor_allocations FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_update_hr_labor_allocations" ON public.hr_labor_allocations FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_delete_hr_labor_allocations" ON public.hr_labor_allocations FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE INDEX idx_hr_labor_alloc_month ON public.hr_labor_allocations(reference_month);

-- Trigger set_tenant_id para todas as tabelas
CREATE TRIGGER set_tenant_id_hr_departments BEFORE INSERT ON public.hr_departments FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_hr_teams BEFORE INSERT ON public.hr_teams FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_hr_positions BEFORE INSERT ON public.hr_positions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_hr_employees BEFORE INSERT ON public.hr_employees FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_hr_timesheets BEFORE INSERT ON public.hr_timesheets FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_hr_labor_allocations BEFORE INSERT ON public.hr_labor_allocations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Realtime para timesheets
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_timesheets;
