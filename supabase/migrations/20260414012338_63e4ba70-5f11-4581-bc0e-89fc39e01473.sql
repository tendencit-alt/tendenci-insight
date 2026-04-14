
CREATE TABLE public.fin_saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_group text NOT NULL DEFAULT 'executivo' CHECK (report_group IN ('executivo','analitico','operacional','auditoria')),
  data_source text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  grouping_field text,
  visualization text NOT NULL DEFAULT 'tabela' CHECK (visualization IN ('tabela','barras','linha','cards')),
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_saved_reports_user ON public.fin_saved_reports(created_by, tenant_id);
CREATE INDEX idx_fin_saved_reports_group ON public.fin_saved_reports(report_group, tenant_id);

ALTER TABLE public.fin_saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for saved reports"
  ON public.fin_saved_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_saved_reports
  BEFORE INSERT ON public.fin_saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_fin_saved_reports_updated_at
  BEFORE UPDATE ON public.fin_saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
