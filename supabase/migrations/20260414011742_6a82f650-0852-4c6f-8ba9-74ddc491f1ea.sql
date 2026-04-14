
-- Period closing control
CREATE TABLE public.fin_period_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_by uuid,
  closed_at timestamptz,
  reopened_by uuid,
  reopened_at timestamptz,
  reopen_reason text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, month, tenant_id)
);

ALTER TABLE public.fin_period_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for period closings"
  ON public.fin_period_closings AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_period_closings
  BEFORE INSERT ON public.fin_period_closings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_fin_period_closings_updated_at
  BEFORE UPDATE ON public.fin_period_closings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial versioning
CREATE TABLE public.fin_financial_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  version_number integer NOT NULL DEFAULT 1,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_versions_entity ON public.fin_financial_versions(entity_type, entity_id, tenant_id);

ALTER TABLE public.fin_financial_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for financial versions"
  ON public.fin_financial_versions AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_financial_versions
  BEFORE INSERT ON public.fin_financial_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Impact logs
CREATE TABLE public.fin_impact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_table text NOT NULL,
  record_id uuid,
  field_changed text,
  old_value text,
  new_value text,
  estimated_impact numeric DEFAULT 0,
  impact_description text,
  user_id uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_impact_logs_date ON public.fin_impact_logs(created_at DESC, tenant_id);

ALTER TABLE public.fin_impact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for impact logs"
  ON public.fin_impact_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_impact_logs
  BEFORE INSERT ON public.fin_impact_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
