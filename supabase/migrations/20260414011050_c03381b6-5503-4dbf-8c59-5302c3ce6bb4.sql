-- Forecast entries table
CREATE TABLE public.fin_forecast_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  chart_account_id uuid REFERENCES public.fin_chart_accounts(id),
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  project_id uuid REFERENCES public.fin_projects(id),
  forecast_amount numeric NOT NULL DEFAULT 0,
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('automatica','pipeline','recorrencia','manual','tendencia_historica')),
  scenario text NOT NULL DEFAULT 'provavel' CHECK (scenario IN ('conservador','provavel','agressivo')),
  locked boolean NOT NULL DEFAULT false,
  notes text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_forecast_period ON public.fin_forecast_entries(year, month, scenario, tenant_id);
CREATE INDEX idx_fin_forecast_account ON public.fin_forecast_entries(chart_account_id, year, month);

ALTER TABLE public.fin_forecast_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for forecast entries"
  ON public.fin_forecast_entries
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_forecast_entries
  BEFORE INSERT ON public.fin_forecast_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_fin_forecast_entries_updated_at
  BEFORE UPDATE ON public.fin_forecast_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forecast scenarios table
CREATE TABLE public.fin_forecast_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scenario_type text NOT NULL DEFAULT 'provavel' CHECK (scenario_type IN ('conservador','provavel','agressivo')),
  adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  tenant_id uuid REFERENCES public.tenants(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fin_forecast_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for forecast scenarios"
  ON public.fin_forecast_scenarios
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_forecast_scenarios
  BEFORE INSERT ON public.fin_forecast_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_fin_forecast_scenarios_updated_at
  BEFORE UPDATE ON public.fin_forecast_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();