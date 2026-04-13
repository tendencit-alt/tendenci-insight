
-- 1. Business Events Audit Log
CREATE TABLE public.fin_business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  event_type TEXT NOT NULL, -- order_approved, order_invoiced, payment_received, payable_created, supplier_paid, recurring_generated, loan_contracted, loan_installment_paid, payroll, asset_purchased, reconciliation, goal_created
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  event_data JSONB DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_result JSONB,
  error_message TEXT,
  created_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fin_business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for business events"
  ON public.fin_business_events FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_fin_biz_events_tenant ON public.fin_business_events(tenant_id);
CREATE INDEX idx_fin_biz_events_type ON public.fin_business_events(event_type, processing_status);
CREATE INDEX idx_fin_biz_events_source ON public.fin_business_events(source_table, source_id);

-- 2. Recurring Contracts
CREATE TABLE public.fin_recurring_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  description TEXT NOT NULL,
  party_type TEXT NOT NULL DEFAULT 'client', -- client, supplier
  party_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  start_date DATE NOT NULL,
  end_date DATE,
  next_generation_date DATE NOT NULL,
  adjustment_rate NUMERIC DEFAULT 0,
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  bank_account_id UUID REFERENCES public.fin_bank_accounts(id),
  auto_generate BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active', -- active, paused, ended
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fin_recurring_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for recurring contracts"
  ON public.fin_recurring_contracts FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Assets (depreciable)
CREATE TABLE public.fin_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- moveis, equipamentos, veiculos, software, imoveis
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC NOT NULL,
  useful_life_months INT NOT NULL DEFAULT 60,
  depreciation_method TEXT DEFAULT 'linear', -- linear, declining
  residual_value NUMERIC DEFAULT 0,
  current_book_value NUMERIC,
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  payable_id UUID,
  ledger_entry_id UUID,
  status TEXT DEFAULT 'active', -- active, disposed, fully_depreciated
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fin_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for assets"
  ON public.fin_assets FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Depreciation Schedule
CREATE TABLE public.fin_depreciation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  asset_id UUID REFERENCES public.fin_assets(id) ON DELETE CASCADE NOT NULL,
  period_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  accumulated NUMERIC NOT NULL DEFAULT 0,
  ledger_entry_id UUID,
  status TEXT DEFAULT 'pending', -- pending, posted, skipped
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fin_depreciation_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for depreciation"
  ON public.fin_depreciation_schedule FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_depreciation_asset ON public.fin_depreciation_schedule(asset_id, period_date);

-- 5. Loan Installments
CREATE TABLE public.fin_loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  loan_id UUID REFERENCES public.fin_loan_contracts(id) ON DELETE CASCADE NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  interest_amount NUMERIC NOT NULL DEFAULT 0,
  iof_amount NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE,
  paid_amount NUMERIC,
  payable_id UUID,
  ledger_entry_principal_id UUID,
  ledger_entry_interest_id UUID,
  ledger_entry_iof_id UUID,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fin_loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for loan installments"
  ON public.fin_loan_installments FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_loan_installments ON public.fin_loan_installments(loan_id, due_date);
