
-- Extend bank transactions with smart reconciliation fields
ALTER TABLE public.fin_bank_transactions
  ADD COLUMN IF NOT EXISTS reconciliation_score INT,
  ADD COLUMN IF NOT EXISTS classification_score INT,
  ADD COLUMN IF NOT EXISTS reconciliation_method TEXT, -- auto, manual, split, none
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC,
  ADD COLUMN IF NOT EXISTS suggested_chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  ADD COLUMN IF NOT EXISTS suggested_cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  ADD COLUMN IF NOT EXISTS suggested_project_id UUID REFERENCES public.fin_projects(id),
  ADD COLUMN IF NOT EXISTS classification_status TEXT DEFAULT 'pending', -- pending, auto_classified, suggested, classified
  ADD COLUMN IF NOT EXISTS classification_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of_id UUID REFERENCES public.fin_bank_transactions(id),
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Extend reconciliation links
ALTER TABLE public.fin_reconciliation_links
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'active', -- active, reversed
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS payable_id UUID,
  ADD COLUMN IF NOT EXISTS receivable_id UUID;

-- Index for smart reconciliation lookups
CREATE INDEX IF NOT EXISTS idx_bank_tx_tenant ON public.fin_bank_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_status_class ON public.fin_bank_transactions(status, classification_status);
CREATE INDEX IF NOT EXISTS idx_bank_tx_duplicate ON public.fin_bank_transactions(is_duplicate) WHERE is_duplicate = true;
