CREATE TABLE public.fin_executive_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  kpi_name text NOT NULL,
  kpi_group text NOT NULL DEFAULT 'geral',
  valor_atual numeric NOT NULL DEFAULT 0,
  valor_meta numeric,
  valor_forecast numeric,
  variacao_percentual numeric,
  tendencia text DEFAULT 'stable' CHECK (tendencia IN ('up','down','stable')),
  notes text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_kpi_snapshots_date ON public.fin_executive_kpi_snapshots(snapshot_date, tenant_id);
CREATE INDEX idx_fin_kpi_snapshots_name ON public.fin_executive_kpi_snapshots(kpi_name, snapshot_date);

ALTER TABLE public.fin_executive_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for kpi snapshots"
  ON public.fin_executive_kpi_snapshots
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_kpi_snapshots
  BEFORE INSERT ON public.fin_executive_kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_fin_kpi_snapshots_updated_at
  BEFORE UPDATE ON public.fin_executive_kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();