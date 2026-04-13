
-- Rules table for keyword-based and learned classification
CREATE TABLE public.fin_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  rule_type TEXT NOT NULL DEFAULT 'keyword', -- keyword, supplier, pattern, origin, semantic
  priority INT NOT NULL DEFAULT 1, -- 1=highest
  match_field TEXT NOT NULL DEFAULT 'description', -- description, party, amount_pattern, origin
  match_value TEXT NOT NULL, -- keyword or normalized value to match
  match_operator TEXT NOT NULL DEFAULT 'contains', -- contains, exact, regex, range
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  nature TEXT, -- Receita, Despesa, Capital, Investimento, Resultado
  in_dre BOOLEAN DEFAULT true,
  in_cashflow BOOLEAN DEFAULT true,
  confidence_base INT NOT NULL DEFAULT 80, -- base confidence score
  active BOOLEAN DEFAULT true,
  confirmation_count INT DEFAULT 0,
  auto_promoted BOOLEAN DEFAULT false, -- true when 5+ confirmations
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Learning history table
CREATE TABLE public.fin_classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  original_description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  party_id TEXT, -- supplier or client id
  party_name TEXT,
  party_type TEXT, -- supplier, client
  entry_type TEXT, -- receita, despesa
  amount_range TEXT, -- e.g. "1000-2000"
  bank_account_id UUID,
  origin TEXT, -- manual, ofx, reconciliation, order, payable, receivable
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  nature TEXT,
  in_dre BOOLEAN,
  in_cashflow BOOLEAN,
  confirmation_count INT DEFAULT 1,
  last_confirmed_by UUID,
  last_confirmed_at TIMESTAMPTZ DEFAULT now(),
  strength TEXT DEFAULT 'weak', -- weak(1), moderate(3), strong(5+)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add classification metadata to ledger entries
ALTER TABLE public.fin_ledger_entries 
  ADD COLUMN IF NOT EXISTS classification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS classification_score INT,
  ADD COLUMN IF NOT EXISTS classification_source TEXT,
  ADD COLUMN IF NOT EXISTS classification_rule_id UUID REFERENCES public.fin_classification_rules(id);

-- Enable RLS
ALTER TABLE public.fin_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_classification_history ENABLE ROW LEVEL SECURITY;

-- Policies for rules
CREATE POLICY "Users can view tenant rules" ON public.fin_classification_rules
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tenant rules" ON public.fin_classification_rules
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for history
CREATE POLICY "Users can view tenant history" ON public.fin_classification_history
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tenant history" ON public.fin_classification_history
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_class_rules_tenant ON public.fin_classification_rules(tenant_id, active);
CREATE INDEX idx_class_rules_match ON public.fin_classification_rules(match_value, match_field);
CREATE INDEX idx_class_history_tenant ON public.fin_classification_history(tenant_id);
CREATE INDEX idx_class_history_desc ON public.fin_classification_history(normalized_description);
CREATE INDEX idx_class_history_party ON public.fin_classification_history(party_id);
CREATE INDEX idx_ledger_class_status ON public.fin_ledger_entries(classification_status);
