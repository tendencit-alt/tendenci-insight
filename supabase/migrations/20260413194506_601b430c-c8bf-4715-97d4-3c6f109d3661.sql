
-- 1. Expand fin_financial_goals with dimensional columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_financial_goals' AND column_name = 'client_id') THEN
    ALTER TABLE public.fin_financial_goals ADD COLUMN client_id uuid REFERENCES public.clients(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_financial_goals' AND column_name = 'vendedor_id') THEN
    ALTER TABLE public.fin_financial_goals ADD COLUMN vendedor_id uuid REFERENCES public.profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_financial_goals' AND column_name = 'order_id') THEN
    ALTER TABLE public.fin_financial_goals ADD COLUMN order_id uuid REFERENCES public.orders(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_financial_goals' AND column_name = 'target_type') THEN
    ALTER TABLE public.fin_financial_goals ADD COLUMN target_type text NOT NULL DEFAULT 'absoluto';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fin_goals_client ON public.fin_financial_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_goals_vendedor ON public.fin_financial_goals(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_fin_goals_order ON public.fin_financial_goals(order_id);
CREATE INDEX IF NOT EXISTS idx_fin_goals_metric ON public.fin_financial_goals(metric_key, year, month);

-- 2. Expand fin_budgets with dimensional columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_budgets' AND column_name = 'client_id') THEN
    ALTER TABLE public.fin_budgets ADD COLUMN client_id uuid REFERENCES public.clients(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_budgets' AND column_name = 'vendedor_id') THEN
    ALTER TABLE public.fin_budgets ADD COLUMN vendedor_id uuid REFERENCES public.profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_budgets' AND column_name = 'order_id') THEN
    ALTER TABLE public.fin_budgets ADD COLUMN order_id uuid REFERENCES public.orders(id);
  END IF;
END $$;

-- 3. Create fin_forecasts table
CREATE TABLE IF NOT EXISTS public.fin_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  metric_key text NOT NULL,
  forecast_amount numeric NOT NULL DEFAULT 0,
  realized_amount numeric NOT NULL DEFAULT 0,
  gap_amount numeric GENERATED ALWAYS AS (forecast_amount - realized_amount) STORED,
  gap_percent numeric GENERATED ALWAYS AS (
    CASE WHEN forecast_amount != 0 THEN ((forecast_amount - realized_amount) / forecast_amount) * 100 ELSE 0 END
  ) STORED,
  target_amount numeric DEFAULT 0,
  auto_calculated boolean DEFAULT true,
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  project_id uuid REFERENCES public.fin_projects(id),
  client_id uuid REFERENCES public.clients(id),
  vendedor_id uuid REFERENCES public.profiles(id),
  order_id uuid REFERENCES public.orders(id),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_fin_forecasts_period ON public.fin_forecasts(year, month, metric_key);
CREATE INDEX IF NOT EXISTS idx_fin_forecasts_tenant ON public.fin_forecasts(tenant_id);

ALTER TABLE public.fin_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fin_forecasts" ON public.fin_forecasts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_forecasts" ON public.fin_forecasts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_forecasts" ON public.fin_forecasts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fin_forecasts" ON public.fin_forecasts
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_fin_forecasts_updated_at BEFORE UPDATE ON public.fin_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create fin_goal_alerts table
CREATE TABLE IF NOT EXISTS public.fin_goal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES public.fin_financial_goals(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  alert_type text NOT NULL, -- risk_miss_goal, expense_over_limit, margin_drop, ebitda_drop, cash_drop
  severity text NOT NULL DEFAULT 'warning', -- info, warning, critical
  message text NOT NULL,
  current_value numeric,
  target_value numeric,
  deviation_percent numeric,
  status text NOT NULL DEFAULT 'pendente', -- pendente, visualizado, resolvido, ignorado
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_fin_goal_alerts_status ON public.fin_goal_alerts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_fin_goal_alerts_tenant ON public.fin_goal_alerts(tenant_id);

ALTER TABLE public.fin_goal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fin_goal_alerts" ON public.fin_goal_alerts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_goal_alerts" ON public.fin_goal_alerts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_goal_alerts" ON public.fin_goal_alerts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fin_goal_alerts" ON public.fin_goal_alerts
  FOR DELETE TO authenticated USING (true);
