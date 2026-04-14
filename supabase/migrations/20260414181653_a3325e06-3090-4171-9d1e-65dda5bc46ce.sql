
-- Probabilidade automática por etapa
ALTER TABLE public.crm_stages ADD COLUMN IF NOT EXISTS probability_percent NUMERIC DEFAULT 0;

-- Propostas comerciais
CREATE TABLE public.crm_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER DEFAULT 1,
  value NUMERIC DEFAULT 0,
  payment_condition TEXT,
  delivery_days INTEGER,
  status TEXT DEFAULT 'rascunho',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_crm_proposals" ON public.crm_proposals FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_ins_crm_proposals" ON public.crm_proposals FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_upd_crm_proposals" ON public.crm_proposals FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_del_crm_proposals" ON public.crm_proposals FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE TRIGGER set_tenant_id_crm_proposals BEFORE INSERT ON public.crm_proposals FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Versões de proposta
CREATE TABLE public.crm_proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.crm_proposals(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  value NUMERIC DEFAULT 0,
  payment_condition TEXT,
  delivery_days INTEGER,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_proposal_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_crm_proposal_versions" ON public.crm_proposal_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.crm_proposals p WHERE p.id = proposal_id AND p.tenant_id = (SELECT get_user_tenant_id()))
);
CREATE POLICY "tenant_ins_crm_proposal_versions" ON public.crm_proposal_versions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.crm_proposals p WHERE p.id = proposal_id AND p.tenant_id = (SELECT get_user_tenant_id()))
);

-- Forecast de receita automático
CREATE TABLE public.crm_revenue_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE NOT NULL,
  reference_month DATE NOT NULL,
  gross_value NUMERIC DEFAULT 0,
  probability_percent NUMERIC DEFAULT 0,
  weighted_value NUMERIC GENERATED ALWAYS AS (gross_value * probability_percent / 100) STORED,
  project_id UUID REFERENCES public.prj_projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_revenue_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_sel_crm_revenue_forecast" ON public.crm_revenue_forecast FOR SELECT TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_ins_crm_revenue_forecast" ON public.crm_revenue_forecast FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_upd_crm_revenue_forecast" ON public.crm_revenue_forecast FOR UPDATE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE POLICY "tenant_del_crm_revenue_forecast" ON public.crm_revenue_forecast FOR DELETE TO authenticated USING (tenant_id = (SELECT get_user_tenant_id()));
CREATE TRIGGER set_tenant_id_crm_revenue_forecast BEFORE INSERT ON public.crm_revenue_forecast FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Índices
CREATE INDEX idx_crm_proposals_deal ON public.crm_proposals(deal_id);
CREATE INDEX idx_crm_revenue_forecast_month ON public.crm_revenue_forecast(reference_month);
CREATE INDEX idx_crm_revenue_forecast_tenant ON public.crm_revenue_forecast(tenant_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_revenue_forecast;

-- Atualizar probabilidades padrão nas etapas existentes
UPDATE public.crm_stages SET probability_percent = 
  CASE 
    WHEN lower(name) LIKE '%lead%' OR position = 0 THEN 10
    WHEN lower(name) LIKE '%qualif%' THEN 20
    WHEN lower(name) LIKE '%diagn%' THEN 40
    WHEN lower(name) LIKE '%propos%' THEN 60
    WHEN lower(name) LIKE '%negoc%' THEN 75
    WHEN lower(name) LIKE '%fecha%' THEN 90
    WHEN lower(name) LIKE '%ganh%' OR lower(name) LIKE '%won%' THEN 100
    ELSE probability_percent
  END
WHERE probability_percent = 0 OR probability_percent IS NULL;
