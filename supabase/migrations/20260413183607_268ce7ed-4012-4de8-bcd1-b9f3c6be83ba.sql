
-- Origin automation rules
CREATE TABLE public.fin_origin_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  origin_key TEXT NOT NULL,
  origin_label TEXT NOT NULL,
  description TEXT,
  -- Automation flags
  generates_provision BOOLEAN DEFAULT false,
  generates_immediate_cash BOOLEAN DEFAULT false,
  requires_reconciliation BOOLEAN DEFAULT false,
  inherits_cost_center BOOLEAN DEFAULT false,
  inherits_project BOOLEAN DEFAULT false,
  requires_justification BOOLEAN DEFAULT false,
  requires_document_link BOOLEAN DEFAULT false,
  allows_auto_classification BOOLEAN DEFAULT false,
  -- Additional rules
  requires_category BOOLEAN DEFAULT true,
  allows_recurrence BOOLEAN DEFAULT false,
  allows_split BOOLEAN DEFAULT false,
  requires_supplier BOOLEAN DEFAULT false,
  requires_client BOOLEAN DEFAULT false,
  -- DRE/Cashflow triggers
  dre_trigger TEXT DEFAULT 'competencia', -- competencia, faturamento, pagamento, none
  cashflow_trigger TEXT DEFAULT 'pagamento', -- pagamento, recebimento, imediato, none
  -- Audit level
  audit_level TEXT DEFAULT 'standard', -- standard, reinforced
  -- Access
  allowed_roles TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, origin_key)
);

ALTER TABLE public.fin_origin_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for origin rules"
  ON public.fin_origin_rules FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_fin_origin_rules_tenant ON public.fin_origin_rules(tenant_id, origin_key);
