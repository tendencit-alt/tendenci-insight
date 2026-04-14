
-- Origin links table
CREATE TABLE public.fin_origin_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_type text NOT NULL,
  origin_id uuid NOT NULL,
  financial_entry_id uuid REFERENCES public.fin_ledger_entries(id) ON DELETE CASCADE,
  payable_id uuid REFERENCES public.fin_payables(id) ON DELETE SET NULL,
  impact_type text NOT NULL DEFAULT 'geral',
  impact_layer text NOT NULL DEFAULT 'dre' CHECK (impact_layer IN ('dre','fluxo','forecast','budget','kpi')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  cancelled_at timestamptz,
  cancelled_reason text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(origin_type, origin_id, financial_entry_id, impact_layer)
);

CREATE INDEX idx_fin_origin_links_origin ON public.fin_origin_links(origin_type, origin_id, tenant_id);
CREATE INDEX idx_fin_origin_links_entry ON public.fin_origin_links(financial_entry_id);
CREATE INDEX idx_fin_origin_links_status ON public.fin_origin_links(status, tenant_id);

ALTER TABLE public.fin_origin_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for origin links"
  ON public.fin_origin_links AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_fin_origin_links
  BEFORE INSERT ON public.fin_origin_links
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
