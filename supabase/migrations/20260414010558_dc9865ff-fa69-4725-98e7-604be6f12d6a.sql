-- Add version_label and budget_type to fin_budgets
ALTER TABLE public.fin_budgets
  ADD COLUMN IF NOT EXISTS version_label text NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'DESPESA';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_fin_budgets_version ON public.fin_budgets(year, month, version_label, tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_budgets_chart ON public.fin_budgets(chart_account_id, year, month);