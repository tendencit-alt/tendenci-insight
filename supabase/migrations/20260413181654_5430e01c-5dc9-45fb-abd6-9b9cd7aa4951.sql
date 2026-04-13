
-- Add min safety balance to company settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS min_safety_balance numeric DEFAULT 0;

-- Add period_type to financial goals
ALTER TABLE public.fin_financial_goals
ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'monthly';

-- Add index for faster goal lookups
CREATE INDEX IF NOT EXISTS idx_fin_financial_goals_lookup
ON public.fin_financial_goals (year, month, goal_type, metric_key);
