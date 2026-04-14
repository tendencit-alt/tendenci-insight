
-- Metas corporativas
CREATE TABLE public.plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'faturamento',
  scope TEXT DEFAULT 'empresa',
  area TEXT,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.prj_projects(id),
  owner_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  achievement_pct NUMERIC GENERATED ALWAYS AS (CASE WHEN target_value > 0 THEN ROUND((current_value / target_value) * 100, 1) ELSE 0 END) STORED,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.plan_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_plan_goals" ON public.plan_goals FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_ins_plan_goals" ON public.plan_goals FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_upd_plan_goals" ON public.plan_goals FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_del_plan_goals" ON public.plan_goals FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE TRIGGER set_tenant_id_plan_goals BEFORE INSERT ON public.plan_goals FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE INDEX idx_plan_goals_tenant ON public.plan_goals(tenant_id);

-- Orçamento empresarial
CREATE TABLE public.plan_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  category TEXT NOT NULL DEFAULT 'receita',
  subcategory TEXT,
  description TEXT,
  reference_month DATE NOT NULL,
  planned_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  deviation NUMERIC GENERATED ALWAYS AS (actual_value - planned_value) STORED,
  deviation_pct NUMERIC GENERATED ALWAYS AS (CASE WHEN planned_value != 0 THEN ROUND(((actual_value - planned_value) / planned_value) * 100, 1) ELSE 0 END) STORED,
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.prj_projects(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.plan_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_plan_budgets" ON public.plan_budgets FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_ins_plan_budgets" ON public.plan_budgets FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_upd_plan_budgets" ON public.plan_budgets FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_del_plan_budgets" ON public.plan_budgets FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE TRIGGER set_tenant_id_plan_budgets BEFORE INSERT ON public.plan_budgets FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE INDEX idx_plan_budgets_month ON public.plan_budgets(reference_month);
CREATE INDEX idx_plan_budgets_tenant ON public.plan_budgets(tenant_id);

-- Cenários de simulação
CREATE TABLE public.plan_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'custom',
  parameters JSONB DEFAULT '{}',
  projected_revenue NUMERIC DEFAULT 0,
  projected_cost NUMERIC DEFAULT 0,
  projected_profit NUMERIC GENERATED ALWAYS AS (projected_revenue - projected_cost) STORED,
  projected_margin_pct NUMERIC GENERATED ALWAYS AS (CASE WHEN projected_revenue > 0 THEN ROUND(((projected_revenue - projected_cost) / projected_revenue) * 100, 1) ELSE 0 END) STORED,
  cash_need NUMERIC DEFAULT 0,
  runway_months NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.plan_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_plan_scenarios" ON public.plan_scenarios FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_ins_plan_scenarios" ON public.plan_scenarios FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_upd_plan_scenarios" ON public.plan_scenarios FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_del_plan_scenarios" ON public.plan_scenarios FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE TRIGGER set_tenant_id_plan_scenarios BEFORE INSERT ON public.plan_scenarios FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_scenarios;
